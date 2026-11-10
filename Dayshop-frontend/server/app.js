import {
  createDecipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  getEmailError,
  getLoginFieldError,
  getRegistrationFieldError,
  normalizeEmail,
  REGISTRATION_FIELDS,
} from '../shared/validation.js'
import {
  esProductoValido,
  normalizarProducto,
  PRODUCTOS_PREDETERMINADOS,
  validateProducto,
} from '../shared/catalog.js'
import { obtenerCiudad } from '../shared/envios.js'
import {
  normalizarDireccion,
  validateDireccion,
} from '../shared/direcciones.js'
import { MENSAJE_SIN_COBERTURA } from '../shared/mensajes.js'
import {
  ADMIN_USERS,
  normalizarRol,
  ROL_ADMIN,
  ROL_CLIENTE,
} from '../src/data/usuarios.js'

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DAYSHOP_DATA_DIR
  ? join(process.env.DAYSHOP_DATA_DIR)
  : join(CURRENT_DIR, 'data')
const USERS_FILE = join(DATA_DIR, 'users.json')
const PRODUCTOS_FILE = join(DATA_DIR, 'productos.json')
const DIRECCIONES_FILE = join(DATA_DIR, 'direcciones.json')

const SESSION_COOKIE = 'dayshop_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_BODY_BYTES = 16 * 1024
const MAX_PRODUCT_BODY_BYTES = 2 * 1024 * 1024
const MAX_LOGIN_ATTEMPTS = readPositiveNumber(
  process.env.DAYSHOP_MAX_LOGIN_ATTEMPTS,
  5,
)
const LOGIN_LOCK_MS = readPositiveNumber(
  process.env.DAYSHOP_LOGIN_LOCK_MS,
  15 * 60 * 1000,
)
const SCRYPT_KEY_LENGTH = 64
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
}
const scrypt = promisify(scryptCallback)

function readPositiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const sessions = new Map()
const loginAttempts = new Map()

let usersCache = null
let usersLoadPromise = null
let usersWriteQueue = Promise.resolve()

let productosCache = null
let productosLoadPromise = null
let productosWriteQueue = Promise.resolve()

let direccionesCache = null
let direccionesLoadPromise = null
let direccionesWriteQueue = Promise.resolve()

class HttpError extends Error {
  constructor(status, message, errors, headers) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.errors = errors
    this.headers = headers
  }
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value)
  }
  res.end(body)
}

async function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  let size = 0
  const chunks = []

  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) {
      throw new HttpError(413, 'La solicitud es demasiado grande.')
    }
    chunks.push(chunk)
  }

  if (size === 0) return {}

  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    throw new HttpError(400, 'Los datos enviados no son válidos.')
  }
}

function parseCookies(header) {
  if (typeof header !== 'string') return {}

  return header.split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=')
    if (separator < 0) return cookies

    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()

    if (name) {
      try {
        cookies[name] = decodeURIComponent(value)
      } catch {
        cookies[name] = value
      }
    }

    return cookies
  }, {})
}

function hashEmail(email) {
  return createHash('sha256')
    .update(normalizeEmail(email), 'utf8')
    .digest('base64')
}

function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function safeEqual(left, right) {
  return left.length === right.length && timingSafeEqual(left, right)
}

function isSecureRequest(req) {
  return (
    Boolean(req.socket?.encrypted) ||
    req.headers['x-forwarded-proto'] === 'https'
  )
}

function sessionCookie(token, req, maxAgeMs = SESSION_TTL_MS) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ]

  if (isSecureRequest(req)) parts.push('Secure')

  return parts.join('; ')
}

function clearSessionCookie(req) {
  return sessionCookie('', req, 0)
}

function createSession(user) {
  const token = randomBytes(32).toString('base64url')
  sessions.set(hashToken(token), {
    user,
    expiresAt: Date.now() + SESSION_TTL_MS,
  })
  return token
}

function readSession(req) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (!token) return null

  const key = hashToken(token)
  const record = sessions.get(key)
  if (!record) return null

  if (record.expiresAt <= Date.now()) {
    sessions.delete(key)
    return null
  }

  return record
}

function destroySession(req) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (token) sessions.delete(hashToken(token))
}

function requireSession(req) {
  const record = readSession(req)

  if (!record) {
    throw new HttpError(401, 'Inicia sesión para continuar.')
  }

  return record
}

function requireAdmin(req) {
  const record = requireSession(req)

  if (normalizarRol(record.user?.rol) !== ROL_ADMIN) {
    throw new HttpError(403, 'Esta acción requiere permisos de administrador.')
  }

  return record
}

function hasActiveLock(record, now = Date.now()) {
  return Boolean(record && record.lockedUntil > now)
}

function hasExpiredLock(record, now = Date.now()) {
  return Boolean(
    record && record.lockedUntil > 0 && record.lockedUntil <= now,
  )
}

function getLoginLock(email) {
  const record = loginAttempts.get(email)
  if (!record) return 0

  const now = Date.now()
  if (hasActiveLock(record, now)) return record.lockedUntil

  if (hasExpiredLock(record, now)) loginAttempts.delete(email)
  return 0
}

function registerFailedLogin(email) {
  const now = Date.now()
  const record = loginAttempts.get(email)

  if (hasActiveLock(record, now)) return record

  const previousCount =
    record && !hasExpiredLock(record, now) ? Number(record.count) || 0 : 0
  const count = previousCount + 1
  const lockedUntil = count >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_LOCK_MS : 0
  const next = { count, lockedUntil, actualizadoEn: now }

  loginAttempts.set(email, next)
  return next
}

function clearFailedLogins(email) {
  loginAttempts.delete(email)
}

function formatRetryAfter(seconds) {
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} minuto${minutes === 1 ? '' : 's'}`
  }

  return `${seconds} segundo${seconds === 1 ? '' : 's'}`
}

async function persistUsers(users) {
  await mkdir(DATA_DIR, { recursive: true })
  const temporaryFile = `${USERS_FILE}.${process.pid}.tmp`
  await writeFile(temporaryFile, JSON.stringify(users, null, 2), { mode: 0o600 })
  await rename(temporaryFile, USERS_FILE)
}

async function loadUsersFromDisk() {
  await mkdir(DATA_DIR, { recursive: true })

  let users = []
  try {
    const raw = await readFile(USERS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) users = parsed
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const existingIds = new Set(users.map((user) => user?.id))
  const missingAdmins = ADMIN_USERS.filter(
    (admin) => !existingIds.has(admin.id),
  )

  if (missingAdmins.length > 0) {
    users = [...users, ...missingAdmins]
    await persistUsers(users)
  }

  usersCache = users
  return users
}

async function getUsers() {
  if (usersCache) return usersCache
  if (!usersLoadPromise) {
    usersLoadPromise = loadUsersFromDisk().catch((error) => {
      usersLoadPromise = null
      throw error
    })
  }
  return usersLoadPromise
}

function withUsersWrite(task) {
  const run = usersWriteQueue.then(task, task)
  usersWriteQueue = run.catch(() => {})
  return run
}

async function persistProductos(productos) {
  await mkdir(DATA_DIR, { recursive: true })
  const temporaryFile = `${PRODUCTOS_FILE}.${process.pid}.tmp`
  await writeFile(temporaryFile, JSON.stringify(productos, null, 2), {
    mode: 0o600,
  })
  await rename(temporaryFile, PRODUCTOS_FILE)
}

async function loadProductosFromDisk() {
  await mkdir(DATA_DIR, { recursive: true })

  let productos = null
  try {
    const raw = await readFile(PRODUCTOS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('El archivo de productos no tiene un formato válido.')
    }
    productos = parsed.filter(esProductoValido).map(normalizarProducto)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  if (productos === null) {
    productos = PRODUCTOS_PREDETERMINADOS.map(normalizarProducto)
    await persistProductos(productos)
  }

  productosCache = productos
  return productos
}

async function getProductosServidor() {
  if (productosCache) return productosCache
  if (!productosLoadPromise) {
    productosLoadPromise = loadProductosFromDisk().catch((error) => {
      productosLoadPromise = null
      throw error
    })
  }
  return productosLoadPromise
}

function withProductosWrite(task) {
  const run = productosWriteQueue.then(task, task)
  productosWriteQueue = run.catch(() => {})
  return run
}

async function persistirDirecciones(todas) {
  await mkdir(DATA_DIR, { recursive: true })
  const temporaryFile = `${DIRECCIONES_FILE}.${process.pid}.tmp`
  await writeFile(temporaryFile, JSON.stringify(todas, null, 2), { mode: 0o600 })
  await rename(temporaryFile, DIRECCIONES_FILE)
}

async function loadDireccionesFromDisk() {
  await mkdir(DATA_DIR, { recursive: true })

  let todas = {}
  try {
    const raw = await readFile(DIRECCIONES_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      todas = parsed
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  direccionesCache = todas
  return todas
}

async function getDireccionesGuardadas() {
  if (direccionesCache) return direccionesCache
  if (!direccionesLoadPromise) {
    direccionesLoadPromise = loadDireccionesFromDisk().catch((error) => {
      direccionesLoadPromise = null
      throw error
    })
  }
  return direccionesLoadPromise
}

function withDireccionesWrite(task) {
  const run = direccionesWriteQueue.then(task, task)
  direccionesWriteQueue = run.catch(() => {})
  return run
}

function listaDireccionesDe(todas, userId) {
  const lista = todas?.[userId]
  return Array.isArray(lista) ? lista : []
}

function mismaDireccion(actual, nueva) {
  return (
    String(actual.direccion).toLowerCase() === nueva.direccion.toLowerCase() &&
    String(actual.referencia).toLowerCase() ===
      nueva.referencia.toLowerCase() &&
    actual.ciudad === nueva.ciudad &&
    actual.celular === nueva.celular
  )
}

function validarProductoBody(body, base = {}) {
  const valores = {
    titulo: body.titulo !== undefined ? body.titulo : base.titulo,
    categoria: body.categoria !== undefined ? body.categoria : base.categoria,
    precio: body.precio !== undefined ? body.precio : base.precio,
    stock: body.stock !== undefined ? body.stock : base.stock,
    descripcion:
      body.descripcion !== undefined ? body.descripcion : base.descripcion,
    especificaciones:
      body.especificaciones !== undefined
        ? body.especificaciones
        : base.especificaciones,
    imagen: body.imagen !== undefined ? body.imagen : base.imagen,
    activo:
      body.activo !== undefined
        ? body.activo
        : base.activo !== undefined
          ? base.activo
          : true,
  }

  const errors = validateProducto(valores)

  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, 'Revisa los datos del producto.', errors)
  }

  return normalizarProducto(valores)
}

async function isEmailAvailable(email) {
  const normalized = normalizeEmail(email)
  const emailHash = hashEmail(normalized)
  const users = await getUsers()

  return !users.some(
    (user) => user?.email === normalized || user?.emailHash === emailHash,
  )
}

async function createUser(values) {
  return withUsersWrite(async () => {
    const users = await getUsers()
    const email = normalizeEmail(values.email)

    if (!(await isEmailAvailable(email))) {
      throw new HttpError(409, 'Este correo ya está registrado.', {
        email: 'Este correo ya está registrado.',
      })
    }

    const salt = randomBytes(16)
    const passwordKey = await scrypt(
      values.password,
      salt,
      SCRYPT_KEY_LENGTH,
      SCRYPT_OPTIONS,
    )

    const user = {
      id: randomUUID(),
      nombreCompleto: String(values.nombreCompleto).trim(),
      email,
      telefono: String(values.telefono).trim(),
      rol: ROL_CLIENTE,
      passwordHash: [
        'scrypt',
        SCRYPT_OPTIONS.N,
        SCRYPT_OPTIONS.r,
        SCRYPT_OPTIONS.p,
        salt.toString('base64'),
        passwordKey.toString('base64'),
      ].join('$'),
      createdAt: new Date().toISOString(),
    }

    const nextUsers = [...users, user]
    await persistUsers(nextUsers)
    usersCache = nextUsers

    return publicUser(user)
  })
}

function publicUser(user) {
  return {
    id: user.id,
    nombreCompleto: user.nombreCompleto,
    email: user.email,
    telefono: user.telefono,
    rol: normalizarRol(user.rol),
  }
}

async function verifyScryptPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false

  const [algorithm, rawN, rawR, rawP, rawSalt, rawKey] = storedHash.split('$')
  if (algorithm !== 'scrypt') return false

  const N = Number(rawN)
  const r = Number(rawR)
  const p = Number(rawP)
  if (![N, r, p].every(Number.isFinite)) return false

  const salt = Buffer.from(rawSalt, 'base64')
  const expected = Buffer.from(rawKey, 'base64')
  if (salt.length === 0 || expected.length === 0) return false

  const actual = await scrypt(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: SCRYPT_OPTIONS.maxmem,
  })

  return safeEqual(actual, expected)
}

function verifyLegacyUser(user, password) {
  if (
    typeof user?.salt !== 'string' ||
    typeof user?.authHash !== 'string' ||
    typeof user?.iv !== 'string' ||
    typeof user?.profile !== 'string'
  ) {
    return null
  }

  const iterations = Number(user.iterations)
  if (!Number.isFinite(iterations) || iterations <= 0) return null

  try {
    const salt = Buffer.from(user.salt, 'base64')
    const passwordKey = pbkdf2Sync(
      password,
      salt,
      iterations,
      32,
      'sha256',
    )
    const authHash = createHash('sha256').update(passwordKey).digest()
    const expectedHash = Buffer.from(user.authHash, 'base64')

    if (!safeEqual(authHash, expectedHash)) return null

    const profileData = Buffer.from(user.profile, 'base64')
    const tag = profileData.subarray(profileData.length - 16)
    const ciphertext = profileData.subarray(0, profileData.length - 16)
    const decipher = createDecipheriv(
      'aes-256-gcm',
      passwordKey,
      Buffer.from(user.iv, 'base64'),
    )
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ])
    const profile = JSON.parse(decrypted.toString('utf8'))

    return {
      id: user.id,
      ...profile,
      rol: normalizarRol(profile.rol),
    }
  } catch {
    return null
  }
}

async function authenticate(values) {
  const email = normalizeEmail(values.email)
  const users = await getUsers()
  const user = users.find((candidate) => candidate?.email === email)

  if (user?.passwordHash) {
    const valid = await verifyScryptPassword(
      values.password,
      user.passwordHash,
    )
    return valid ? publicUser(user) : null
  }

  const legacyUser = users.find(
    (candidate) => candidate?.emailHash === hashEmail(email),
  )
  if (!legacyUser) return null

  return verifyLegacyUser(legacyUser, values.password)
}

function validateRegistrationBody(body) {
  const values = {}

  for (const field of REGISTRATION_FIELDS) {
    values[field] = typeof body[field] === 'string' ? body[field] : ''
  }

  const errors = {}
  for (const field of REGISTRATION_FIELDS) {
    const error = getRegistrationFieldError(field, values[field])
    if (error) errors[field] = error
  }

  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, 'Revisa los datos del registro.', errors)
  }

  return values
}

function validateLoginBody(body) {
  const values = {
    email: typeof body.email === 'string' ? body.email : '',
    password: typeof body.password === 'string' ? body.password : '',
  }

  const errors = {}
  const emailError = getLoginFieldError('email', values.email)
  const passwordError = getLoginFieldError('password', values.password)

  if (emailError) errors.email = emailError
  if (passwordError) errors.password = passwordError

  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, 'Revisa los datos ingresados.', errors)
  }

  return values
}

async function handleRegister(req, res) {
  const body = await readJsonBody(req)
  const values = validateRegistrationBody(body)
  const user = await createUser(values)
  const token = createSession(user)

  sendJson(res, 201, { user }, { 'Set-Cookie': sessionCookie(token, req) })
}

async function handleLogin(req, res) {
  const body = await readJsonBody(req)
  const values = validateLoginBody(body)
  const email = normalizeEmail(values.email)
  const lockedUntil = getLoginLock(email)

  if (lockedUntil) {
    const retryAfter = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000))
    throw new HttpError(
      429,
      `Demasiados intentos fallidos. Intenta de nuevo en ${formatRetryAfter(
        retryAfter,
      )}.`,
      { retryAfter, lockedUntil },
      { 'Retry-After': String(retryAfter) },
    )
  }

  const user = await authenticate(values)

  if (!user) {
    const attempt = registerFailedLogin(email)

    if (attempt.lockedUntil) {
      const retryAfter = Math.max(
        1,
        Math.ceil((attempt.lockedUntil - Date.now()) / 1000),
      )
      throw new HttpError(
        429,
        `Demasiados intentos fallidos. Intenta de nuevo en ${formatRetryAfter(
          retryAfter,
        )}.`,
        { retryAfter, lockedUntil: attempt.lockedUntil },
        { 'Retry-After': String(retryAfter) },
      )
    }

    const remaining = MAX_LOGIN_ATTEMPTS - attempt.count
    throw new HttpError(
      401,
      `Correo o contraseña incorrectos. Te quedan ${remaining} intento${
        remaining === 1 ? '' : 's'
      }.`,
    )
  }

  clearFailedLogins(email)
  const token = createSession(user)

  sendJson(res, 200, { user }, { 'Set-Cookie': sessionCookie(token, req) })
}

function handleSession(req, res) {
  const record = readSession(req)

  if (!record) {
    throw new HttpError(401, 'No hay una sesión activa.')
  }

  sendJson(res, 200, { user: record.user })
}

function handleLogout(req, res) {
  destroySession(req)
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie(req) })
}

async function handleEmailAvailability(req, res, url) {
  const email = url.searchParams.get('email') ?? ''
  const error = getEmailError(email)

  if (error) {
    throw new HttpError(400, error, { email: error })
  }

  sendJson(res, 200, { available: await isEmailAvailable(email) })
}

async function handleListarProductos(res) {
  sendJson(res, 200, { productos: await getProductosServidor() })
}

async function handleCrearProducto(req, res) {
  requireAdmin(req)
  const body = await readJsonBody(req, MAX_PRODUCT_BODY_BYTES)

  await withProductosWrite(async () => {
    const productos = await getProductosServidor()
    const producto = {
      ...validarProductoBody(body),
      id: randomUUID(),
    }
    const siguientes = [...productos, producto]

    await persistProductos(siguientes)
    productosCache = siguientes
    sendJson(res, 201, { producto, productos: siguientes })
  })
}

async function handleActualizarProducto(req, res, id) {
  requireAdmin(req)
  const body = await readJsonBody(req, MAX_PRODUCT_BODY_BYTES)

  await withProductosWrite(async () => {
    const productos = await getProductosServidor()
    const indice = productos.findIndex((producto) => producto.id === id)

    if (indice < 0) {
      throw new HttpError(404, 'El producto ya no existe en el catálogo.')
    }

    const producto = {
      ...validarProductoBody(body, productos[indice]),
      id,
    }
    const siguientes = productos.map((actual, posicion) =>
      posicion === indice ? producto : actual,
    )

    await persistProductos(siguientes)
    productosCache = siguientes
    sendJson(res, 200, { producto, productos: siguientes })
  })
}

async function handleCambiarDisponibilidad(req, res, id) {
  requireAdmin(req)
  const body = await readJsonBody(req)

  if (typeof body.activo !== 'boolean') {
    throw new HttpError(400, 'El estado de disponibilidad no es válido.', {
      activo: 'El estado de disponibilidad no es válido.',
    })
  }

  await withProductosWrite(async () => {
    const productos = await getProductosServidor()
    const indice = productos.findIndex((producto) => producto.id === id)

    if (indice < 0) {
      throw new HttpError(404, 'El producto ya no existe en el catálogo.')
    }

    if (body.activo) {
      const errors = validateProducto({
        ...productos[indice],
        activo: true,
      })

      if (Object.keys(errors).length > 0) {
        throw new HttpError(
          400,
          'No se puede publicar el producto hasta completar sus datos.',
          errors,
        )
      }
    }

    const producto = normalizarProducto({
      ...productos[indice],
      activo: body.activo,
    })
    const siguientes = productos.map((actual, posicion) =>
      posicion === indice ? producto : actual,
    )

    await persistProductos(siguientes)
    productosCache = siguientes
    sendJson(res, 200, { producto, productos: siguientes })
  })
}

async function handleEliminarProducto(req, res, id) {
  requireAdmin(req)

  await withProductosWrite(async () => {
    const productos = await getProductosServidor()
    const siguientes = productos.filter((producto) => producto.id !== id)

    if (siguientes.length === productos.length) {
      throw new HttpError(404, 'El producto ya no existe en el catálogo.')
    }

    await persistProductos(siguientes)
    productosCache = siguientes
    sendJson(res, 200, { ok: true, productos: siguientes })
  })
}

async function handleListarDirecciones(req, res) {
  const record = requireSession(req)
  const todas = await getDireccionesGuardadas()

  sendJson(res, 200, {
    direcciones: listaDireccionesDe(todas, record.user.id),
  })
}

async function handleCrearDireccion(req, res) {
  const record = requireSession(req)
  const body = await readJsonBody(req)
  const valores = normalizarDireccion(body)
  const errors = validateDireccion(valores)

  if (Object.keys(errors).length > 0) {
    const mensaje =
      errors.ciudad === MENSAJE_SIN_COBERTURA
        ? MENSAJE_SIN_COBERTURA
        : 'Revisa los datos de envío.'
    throw new HttpError(400, mensaje, errors)
  }

  await withDireccionesWrite(async () => {
    const todas = await getDireccionesGuardadas()
    const userId = record.user.id
    const lista = listaDireccionesDe(todas, userId)
    const existente = lista.find((direccion) =>
      mismaDireccion(direccion, valores),
    )

    if (existente) {
      sendJson(res, 200, { direccion: existente })
      return
    }

    const direccion = {
      id: randomUUID(),
      ...valores,
      creadaEn: new Date().toISOString(),
    }
    const siguientes = { ...todas, [userId]: [direccion, ...lista] }

    await persistirDirecciones(siguientes)
    direccionesCache = siguientes
    sendJson(res, 201, { direccion })
  })
}

async function handleEliminarDireccion(req, res, id) {
  const record = requireSession(req)

  await withDireccionesWrite(async () => {
    const todas = await getDireccionesGuardadas()
    const userId = record.user.id
    const lista = listaDireccionesDe(todas, userId)
    const siguientesLista = lista.filter((direccion) => direccion.id !== id)

    if (siguientesLista.length === lista.length) {
      throw new HttpError(404, 'La dirección ya no existe en tu perfil.')
    }

    const siguientes = { ...todas, [userId]: siguientesLista }

    await persistirDirecciones(siguientes)
    direccionesCache = siguientes
    sendJson(res, 200, { ok: true, direcciones: siguientesLista })
  })
}

async function resolverDireccionPedido(body, user) {
  const direccionId =
    typeof body?.direccionId === 'string' ? body.direccionId.trim() : ''

  if (direccionId) {
    const todas = await getDireccionesGuardadas()
    const guardada = listaDireccionesDe(todas, user.id).find(
      (direccion) => direccion.id === direccionId,
    )

    if (!guardada) {
      throw new HttpError(
        403,
        'No tienes permiso para usar esa dirección de envío.',
      )
    }

    return guardada
  }

  return normalizarDireccion(body?.direccion ?? {})
}

function leerCantidadesPedido(body) {
  const items = Array.isArray(body.items) ? body.items : []
  const cantidades = new Map()

  for (const item of items) {
    const productoId =
      typeof item?.productoId === 'string' ? item.productoId.trim() : ''
    const cantidad = Math.trunc(Number(item?.cantidad))

    if (!productoId || !Number.isInteger(cantidad) || cantidad <= 0) {
      throw new HttpError(400, 'Los productos del pedido no son válidos.')
    }

    cantidades.set(
      productoId,
      (cantidades.get(productoId) ?? 0) + cantidad,
    )
  }

  if (cantidades.size === 0) {
    throw new HttpError(400, 'No hay productos para confirmar el pedido.')
  }

  return cantidades
}

function aCentavos(valor) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? Math.round(numero * 100) : null
}

function formatoMoneda(centavos) {
  return (centavos / 100).toFixed(2)
}

async function handleConfirmarPedido(req, res) {
  const record = requireSession(req)
  const body = await readJsonBody(req)
  const cantidades = leerCantidadesPedido(body)
  const direccion = await resolverDireccionPedido(body, record.user)
  const errors = validateDireccion(direccion)

  if (Object.keys(errors).length > 0) {
    const mensaje =
      errors.ciudad === MENSAJE_SIN_COBERTURA
        ? MENSAJE_SIN_COBERTURA
        : 'Revisa los datos de envío.'
    throw new HttpError(400, mensaje, errors)
  }

  const ciudad = obtenerCiudad(direccion.ciudad)

  if (!ciudad?.cobertura) {
    throw new HttpError(400, MENSAJE_SIN_COBERTURA, {
      ciudad: MENSAJE_SIN_COBERTURA,
    })
  }

  const subtotalEsperado = aCentavos(body.subtotal)
  const costoEnvioEsperado = aCentavos(body.costoEnvio)
  const totalEsperado = aCentavos(body.total)

  if (
    subtotalEsperado === null ||
    costoEnvioEsperado === null ||
    totalEsperado === null
  ) {
    throw new HttpError(400, 'El total del pedido no es válido.')
  }

  await withProductosWrite(async () => {
    const productos = await getProductosServidor()
    const items = []
    let subtotalCentavos = 0

    for (const [productoId, cantidad] of cantidades) {
      const producto = productos.find((item) => item.id === productoId)

      if (!producto) {
        throw new HttpError(404, 'Uno de los productos ya no está disponible.')
      }

      if (!producto.activo) {
        throw new HttpError(
          409,
          `"${producto.titulo}" ya no está a la venta.`,
        )
      }

      if (cantidad > producto.stock) {
        throw new HttpError(
          409,
          `No hay stock suficiente de "${producto.titulo}". Actualiza tu carrito.`,
        )
      }

      const precioCentavos = aCentavos(producto.precio) ?? 0
      const subtotalItemCentavos = precioCentavos * cantidad
      subtotalCentavos += subtotalItemCentavos

      items.push({
        productoId: producto.id,
        titulo: producto.titulo,
        imagen: producto.imagen,
        precio: precioCentavos / 100,
        cantidad,
        subtotal: subtotalItemCentavos / 100,
      })
    }

    const costoEnvioCentavos = aCentavos(ciudad.costoEnvio) ?? 0
    const totalCentavos = subtotalCentavos + costoEnvioCentavos

    if (
      subtotalEsperado !== subtotalCentavos ||
      costoEnvioEsperado !== costoEnvioCentavos ||
      totalEsperado !== totalCentavos
    ) {
      throw new HttpError(
        409,
        'Los precios o el total del pedido cambiaron. Revisa tu carrito e inténtalo de nuevo.',
        {
          subtotal: `Total actual: S/. ${formatoMoneda(subtotalCentavos)}`,
          costoEnvio: `Envío actual: S/. ${formatoMoneda(
            costoEnvioCentavos,
          )}`,
          total: `Total actual: S/. ${formatoMoneda(totalCentavos)}`,
        },
      )
    }

    const siguientes = productos.map((producto) => {
      const cantidad = cantidades.get(producto.id)
      if (!cantidad) return producto
      return normalizarProducto({
        ...producto,
        stock: producto.stock - cantidad,
      })
    })

    await persistProductos(siguientes)
    productosCache = siguientes

    sendJson(res, 200, {
      pedido: {
        items,
        direccion,
        subtotal: subtotalCentavos / 100,
        costoEnvio: costoEnvioCentavos / 100,
        total: totalCentavos / 100,
        confirmadoEn: new Date().toISOString(),
      },
      productos: siguientes,
    })
  })
}

async function routeRequest(req, res, url) {
  const { pathname } = url

  if (req.method === 'POST' && pathname === '/api/auth/register') {
    await handleRegister(req, res)
    return
  }

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    await handleLogin(req, res)
    return
  }

  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    handleLogout(req, res)
    return
  }

  if (req.method === 'GET' && pathname === '/api/auth/session') {
    handleSession(req, res)
    return
  }

  if (req.method === 'GET' && pathname === '/api/auth/email-available') {
    await handleEmailAvailability(req, res, url)
    return
  }

  if (req.method === 'GET' && pathname === '/api/direcciones') {
    await handleListarDirecciones(req, res)
    return
  }

  if (req.method === 'POST' && pathname === '/api/direcciones') {
    await handleCrearDireccion(req, res)
    return
  }

  const direccionMatch = pathname.match(/^\/api\/direcciones\/([^/]+)$/)

  if (req.method === 'DELETE' && direccionMatch) {
    await handleEliminarDireccion(
      req,
      res,
      decodeURIComponent(direccionMatch[1]),
    )
    return
  }

  if (req.method === 'GET' && pathname === '/api/productos') {
    await handleListarProductos(res)
    return
  }

  if (req.method === 'POST' && pathname === '/api/productos') {
    await handleCrearProducto(req, res)
    return
  }

  if (req.method === 'POST' && pathname === '/api/pedidos/confirmar') {
    await handleConfirmarPedido(req, res)
    return
  }

  const disponibilidadMatch = pathname.match(
    /^\/api\/productos\/([^/]+)\/disponibilidad$/,
  )

  if (req.method === 'PATCH' && disponibilidadMatch) {
    await handleCambiarDisponibilidad(
      req,
      res,
      decodeURIComponent(disponibilidadMatch[1]),
    )
    return
  }

  const productoMatch = pathname.match(/^\/api\/productos\/([^/]+)$/)

  if (req.method === 'PUT' && productoMatch) {
    await handleActualizarProducto(
      req,
      res,
      decodeURIComponent(productoMatch[1]),
    )
    return
  }

  if (req.method === 'DELETE' && productoMatch) {
    await handleEliminarProducto(
      req,
      res,
      decodeURIComponent(productoMatch[1]),
    )
    return
  }

  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  throw new HttpError(404, 'Ruta no encontrada.')
}

export async function apiHandler(req, res, next) {
  let url

  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  } catch {
    sendJson(res, 400, { message: 'La solicitud no es válida.' })
    return
  }

  if (!url.pathname.startsWith('/api/')) {
    if (typeof next === 'function') {
      next()
      return
    }

    sendJson(res, 404, { message: 'Ruta no encontrada.' })
    return
  }

  try {
    await routeRequest(req, res, url)
  } catch (error) {
    if (res.headersSent) return

    if (error instanceof HttpError) {
      sendJson(
        res,
        error.status,
        { message: error.message, errors: error.errors },
        error.headers,
      )
      return
    }

    console.error('Error interno en la API de DayShop:', error)
    sendJson(res, 500, {
      message: 'Ocurrió un error interno. Intenta nuevamente.',
    })
  }
}

setInterval(() => {
  const now = Date.now()

  for (const [key, record] of sessions) {
    if (record.expiresAt <= now) sessions.delete(key)
  }

  for (const [email, record] of loginAttempts) {
    const bloqueoExpirado = hasExpiredLock(record, now)
    const sinActividad =
      !record.lockedUntil &&
      now - (Number(record.actualizadoEn) || 0) > LOGIN_LOCK_MS

    if (bloqueoExpirado || sinActividad) {
      loginAttempts.delete(email)
    }
  }
}, 60_000).unref?.()
