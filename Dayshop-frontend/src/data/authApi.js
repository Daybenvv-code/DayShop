import { ApiError } from './apiClient.js'
import { normalizeEmail } from '../../shared/validation.js'
import { ROL_ADMIN } from './usuarios.js'

export { ApiError } from './apiClient.js'

const USERS_KEY = 'dayshop.users'
const SESSION_KEY = 'dayshop.session'

const SEED_ADMIN = {
  id: 'admin-dayshop-local',
  nombreCompleto: 'Administrador DayShop',
  email: 'admin@dayshop.com',
  telefono: '',
  rol: ROL_ADMIN,
  passwordHash:
    'sha256$ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270',
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readUsers() {
  let users

  try {
    const raw = localStorage.getItem(USERS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    users = Array.isArray(parsed) ? parsed : []
  } catch {
    users = []
  }

  if (users.some((user) => user?.email === SEED_ADMIN.email)) return users

  const seededUsers = [...users, SEED_ADMIN]
  writeUsers(seededUsers)
  return seededUsers
}

function writeUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    /* Sin almacenamiento disponible. */
  }
}

async function hashPassword(password) {
  const text = String(password ?? '')

  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
    const hex = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    return `sha256$${hex}`
  }

  return `plain$${text}`
}

function publicUser(user) {
  return {
    id: user.id,
    nombreCompleto: user.nombreCompleto,
    email: user.email,
    telefono: user.telefono,
    rol: user.rol,
  }
}

export async function authenticate(values = {}) {
  await wait(300)

  const email = normalizeEmail(values.email)
  const user = readUsers().find((candidate) => candidate?.email === email)

  if (!user) return null

  const passwordHash = await hashPassword(values.password)
  return passwordHash === user.passwordHash ? publicUser(user) : null
}

export async function registerUser(values = {}) {
  const email = normalizeEmail(values.email)
  const users = readUsers()

  if (users.some((user) => user?.email === email)) {
    throw new ApiError('Este correo ya está registrado.', 409, {
      errors: { email: 'Este correo ya está registrado.' },
    })
  }

  const user = {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    nombreCompleto: String(values.nombreCompleto ?? '').trim(),
    email,
    telefono: String(values.telefono ?? '').trim(),
    rol: 'cliente',
    passwordHash: await hashPassword(values.password),
  }

  writeUsers([...users, user])

  const sessionUser = publicUser(user)
  await saveSession(sessionUser)

  return { user: sessionUser }
}

export async function loginUser(values) {
  const user = await authenticate(values)

  if (!user) {
    throw new ApiError('Correo o contraseña incorrectos.', 401, null)
  }

  await saveSession(user)
  return { user }
}

export async function logoutUser() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* Sin almacenamiento disponible. */
  }

  return null
}

export async function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function saveSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } catch {
    /* Sin almacenamiento disponible: la sesión vive solo en memoria. */
  }
}

export async function checkEmailAvailability(email) {
  const normalized = normalizeEmail(email)
  const available = !readUsers().some((user) => user?.email === normalized)
  return { available }
}
