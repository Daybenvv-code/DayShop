import { ApiError, apiRequest } from './apiClient.js'

export { ApiError } from './apiClient.js'

export function registerUser(values) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

export function loginUser(values) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

export function logoutUser() {
  return apiRequest('/api/auth/logout', { method: 'POST' })
}

export async function getSession() {
  try {
    const data = await apiRequest('/api/auth/session')
    return data?.user ?? null
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export function checkEmailAvailability(email) {
  return apiRequest(
    `/api/auth/email-available?email=${encodeURIComponent(email)}`,
  )
}
