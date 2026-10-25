export const USERS_STORAGE_KEY = 'dayshop:users:v1'
export const ROL_ADMIN = 'admin'
export const ROL_CLIENTE = 'cliente'

const ADMIN_USER = {
  id: 'admin-dayshop',
  emailHash: 'WszC59DOm/vZN6WRJbA5AI1x1hvv854yfvfWsADnSBE=',
  salt: 'gcu7aBPbO0IsDePfvfCGsg==',
  iterations: 210000,
  authHash: 'bOTYbqfba/ZZYJE0K195LOqwlJvTvTg1o8OTGHGBBI4=',
  iv: 'a3KSKMXRUgD1RIng',
  profile:
    '0gRlMDiupTXh891fHWpwXZMu4i6CRe4s38ofBxfm+egiLfnxaFLHrH8XfrvjtBNu/aRijxmQ3NxX/lRNY808Vse5VkHQ8M8CuTTMgBNVJJPU+rz1QQZXWwAN5yb55Q0ckJezxlbFJ33lzzMShYyjdhrHByN2uUmm+a6BvKdKBYg=',
  createdAt: '2026-10-25T19:13:22.482Z',
}

function leerUsuarios() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function normalizarRol(rol) {
  return rol === ROL_ADMIN ? ROL_ADMIN : ROL_CLIENTE
}

export function esAdministrador(session) {
  return normalizarRol(session?.rol) === ROL_ADMIN
}

export function asegurarAdministrador() {
  try {
    const usuarios = leerUsuarios()
    const existe = usuarios.some(
      (usuario) => usuario?.emailHash === ADMIN_USER.emailHash,
    )

    if (existe) return

    localStorage.setItem(
      USERS_STORAGE_KEY,
      JSON.stringify([...usuarios, ADMIN_USER]),
    )
  } catch {
    return
  }
}
