import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
} from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
  getEmailError,
  getNameError,
  getPasswordError,
  getPhoneError,
  normalizeEmail,
} from '../../shared/validation.js'

const scrypt = promisify(scryptCallback)
const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DAYSHOP_DATA_DIR
  ? join(process.env.DAYSHOP_DATA_DIR)
  : join(CURRENT_DIR, '..', 'data')
const USERS_FILE = join(DATA_DIR, 'users.json')

const SCRYPT_KEY_LENGTH = 64
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
}
const DEFAULT_NOMBRE = 'Administrador DayShop'
const DEFAULT_TELEFONO = '999999999'

function hashEmail(email) {
  return createHash('sha256')
    .update(normalizeEmail(email), 'utf8')
    .digest('base64')
}

function readEnv(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function fail(message) {
  console.error(`Error: ${message}`)
  process.exit(1)
}

async function loadUsers() {
  try {
    const raw = await readFile(USERS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      fail('El archivo de usuarios no tiene un formato válido.')
    }
    return parsed
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function persistUsers(users) {
  await mkdir(DATA_DIR, { recursive: true })
  const temporaryFile = `${USERS_FILE}.${process.pid}.tmp`
  await writeFile(temporaryFile, JSON.stringify(users, null, 2), { mode: 0o600 })
  await rename(temporaryFile, USERS_FILE)
}

async function main() {
  const email = normalizeEmail(process.env.DAYSHOP_ADMIN_EMAIL ?? '')
  const password = readEnv('DAYSHOP_ADMIN_PASSWORD')
  const nombreCompleto = readEnv('DAYSHOP_ADMIN_NOMBRE', DEFAULT_NOMBRE).trim()
  const telefono = readEnv('DAYSHOP_ADMIN_TELEFONO', DEFAULT_TELEFONO).trim()

  if (!email) fail('define DAYSHOP_ADMIN_EMAIL.')
  if (!password) fail('define DAYSHOP_ADMIN_PASSWORD.')

  const errors = [
    getEmailError(email),
    getPasswordError(password),
    getNameError(nombreCompleto),
    getPhoneError(telefono),
  ].filter(Boolean)

  if (errors.length > 0) fail(errors.join(' '))

  const users = await loadUsers()
  const emailHash = hashEmail(email)
  const duplicated = users.some(
    (user) => user?.email === email || user?.emailHash === emailHash,
  )

  if (duplicated) fail(`el correo ${email} ya está registrado.`)

  const salt = randomBytes(16)
  const passwordKey = await scrypt(
    password,
    salt,
    SCRYPT_KEY_LENGTH,
    SCRYPT_OPTIONS,
  )

  const user = {
    id: randomUUID(),
    nombreCompleto,
    email,
    telefono,
    rol: 'admin',
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

  await persistUsers([...users, user])

  console.log('Administrador creado correctamente:')
  console.log(`  id:     ${user.id}`)
  console.log(`  email:  ${user.email}`)
  console.log(`  rol:    ${user.rol}`)
  console.log('Reinicia el servidor para que la sesión reconozca al nuevo usuario.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
