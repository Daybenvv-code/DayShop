import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const PASSWORD = 'correct-horse-battery'
const LOCK_MS = 15 * 60 * 1000

let apiHandler
let dataDir

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'dayshop-auth-test-'))
  process.env.DAYSHOP_DATA_DIR = dataDir
  process.env.DAYSHOP_MAX_LOGIN_ATTEMPTS = '5'
  process.env.DAYSHOP_LOGIN_LOCK_MS = String(LOCK_MS)

  ;({ apiHandler } = await import('./app.js'))
})

afterAll(async () => {
  delete process.env.DAYSHOP_DATA_DIR
  delete process.env.DAYSHOP_MAX_LOGIN_ATTEMPTS
  delete process.env.DAYSHOP_LOGIN_LOCK_MS
  await rm(dataDir, { recursive: true, force: true })
})

function createResponse() {
  let body = ''
  const headers = {}

  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value
    },
    end(chunk = '') {
      body += chunk
      res.headersSent = true
    },
    get body() {
      return body
    },
    get headers() {
      return headers
    },
    get json() {
      return body ? JSON.parse(body) : null
    },
  }

  return res
}

async function request(method, url, payload, options = {}) {
  const raw = payload === undefined ? '' : JSON.stringify(payload)
  const req = Readable.from(raw ? [Buffer.from(raw)] : [])

  req.method = method
  req.url = url
  req.headers = {
    host: 'localhost',
    'content-type': 'application/json',
    ...(options.headers ?? {}),
  }

  const res = createResponse()
  await apiHandler(req, res)
  return res
}

async function registerUser(email) {
  const res = await request('POST', '/api/auth/register', {
    nombreCompleto: 'Usuario de Prueba',
    email,
    telefono: '999888777',
    password: PASSWORD,
  })

  expect(res.statusCode).toBe(201)
  return res
}

describe('US-x autenticación: API', () => {
  it('3. no permite el acceso con correo o contraseña incorrectos', async () => {
    const email = 'credenciales@example.com'
    await registerUser(email)

    const wrongPassword = await request('POST', '/api/auth/login', {
      email,
      password: 'contraseña-incorrecta',
    })
    expect(wrongPassword.statusCode).toBe(401)

    const wrongEmail = await request('POST', '/api/auth/login', {
      email: 'no-existe@example.com',
      password: PASSWORD,
    })
    expect(wrongEmail.statusCode).toBe(401)
  })

  it('6. no revela si el correo existe en el mensaje de error', async () => {
    await registerUser('existe@example.com')

    const existing = await request('POST', '/api/auth/login', {
      email: 'existe@example.com',
      password: 'contraseña-incorrecta',
    })
    const missing = await request('POST', '/api/auth/login', {
      email: 'correo-inexistente@example.com',
      password: 'contraseña-incorrecta',
    })

    expect(existing.statusCode).toBe(401)
    expect(missing.statusCode).toBe(401)
    expect(existing.json.message).toBe(missing.json.message)
    expect(existing.json.message).toMatch(/Correo o contraseña incorrectos/)
    expect(existing.json.message).not.toMatch(
      /no existe|no registrado|correo desconocido/i,
    )
  })

  it('9. bloquea la cuenta 15 minutos tras 5 intentos fallidos consecutivos', async () => {
    const email = 'bloqueo@example.com'
    await registerUser(email)

    for (let intento = 1; intento <= 4; intento += 1) {
      const res = await request('POST', '/api/auth/login', {
        email,
        password: 'contraseña-incorrecta',
      })
      expect(res.statusCode).toBe(401)
    }

    const fifth = await request('POST', '/api/auth/login', {
      email,
      password: 'contraseña-incorrecta',
    })
    expect(fifth.statusCode).toBe(429)
    expect(fifth.json.message).toMatch(/Demasiados intentos fallidos/)

    const retryAfter = Number(fifth.headers['retry-after'])
    expect(retryAfter).toBeGreaterThan(LOCK_MS / 1000 - 10)
    expect(retryAfter).toBeLessThanOrEqual(LOCK_MS / 1000)

    const correctWhileLocked = await request('POST', '/api/auth/login', {
      email,
      password: PASSWORD,
    })
    expect(correctWhileLocked.statusCode).toBe(429)
  })
})

describe('US-x registro: API', () => {
  it('2. rechaza un correo electrónico ya registrado', async () => {
    const email = 'registrado@example.com'
    await registerUser(email)

    const taken = await request(
      'GET',
      `/api/auth/email-available?email=${encodeURIComponent(email)}`,
    )
    expect(taken.statusCode).toBe(200)
    expect(taken.json.available).toBe(false)

    const free = await request(
      'GET',
      '/api/auth/email-available?email=libre%40example.com',
    )
    expect(free.statusCode).toBe(200)
    expect(free.json.available).toBe(true)

    const duplicate = await request('POST', '/api/auth/register', {
      nombreCompleto: 'Otro Usuario',
      email,
      telefono: '999888777',
      password: PASSWORD,
    })
    expect(duplicate.statusCode).toBe(409)
    expect(duplicate.json.errors.email).toBeTruthy()
  })

  it('5. guarda la contraseña cifrada e inicia sesión automáticamente', async () => {
    const email = 'auto-login@example.com'
    const registration = await request('POST', '/api/auth/register', {
      nombreCompleto: 'Auto Login',
      email,
      telefono: '999888777',
      password: PASSWORD,
    })

    expect(registration.statusCode).toBe(201)
    const cookie = registration.headers['set-cookie']
    expect(cookie).toMatch(/dayshop_session=/)

    const users = JSON.parse(
      await readFile(join(dataDir, 'users.json'), 'utf8'),
    )
    const stored = users.find((user) => user.email === email)

    expect(stored).toBeTruthy()
    expect(stored.passwordHash).toMatch(/^scrypt\$/)
    expect(stored.passwordHash).not.toContain(PASSWORD)
    expect(JSON.stringify(stored)).not.toContain(PASSWORD)

    const session = await request('GET', '/api/auth/session', undefined, {
      headers: { cookie: cookie.split(';')[0] },
    })
    expect(session.statusCode).toBe(200)
    expect(session.json.user.email).toBe(email)
  })
})
