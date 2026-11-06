export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.errors = data?.errors ?? {}
  }
}

export async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  }

  let response
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
      0,
      null,
    )
  }

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (!response.ok) {
    throw new ApiError(
      data?.message || 'No se pudo completar la solicitud.',
      response.status,
      data,
    )
  }

  return data
}
