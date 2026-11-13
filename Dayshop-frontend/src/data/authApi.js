import { apiRequest } from './apiClient.js'

export { ApiError } from './apiClient.js'

export function registerUser(values) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

const SESSION_KEY = 'dayshop.session'

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function localUser(values = {}) {
  const email = typeof values.email === 'string' ? values.email.trim() : ''

  return {
    id: 'local-user',
    nombreCompleto: email ? email.split('@')[0] : 'Cliente DayShop',
    email,
    telefono: '',
    rol: 'cliente',
  }
}

export async function authenticate(values = {}) {
  await wait(300)
  return localUser(values)
}

function readSession() {
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

export async function loginUser(values) {
  const user = await authenticate(values)
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
  return readSession()
}

export function checkEmailAvailability(email) {
  return apiRequest(
    `/api/auth/email-available?email=${encodeURIComponent(email)}`,
  )
}
