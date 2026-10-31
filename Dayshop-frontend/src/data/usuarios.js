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

const ADMIN_USER_2 = {
  id: 'admin-dayshop-2',
  emailHash: '88zP4WaB3LYZ6NVm21TfbpXiNDGiY1BJ8XHZvsnANog=',
  salt: '3xr9FXOlQh7P4CkNPuF50Q==',
  iterations: 210000,
  authHash: 'v5hdU0+IQA6/PNv2FfBDvz5e0pWhYLZSQ2sv+xKYmfg=',
  iv: 'c1ViBOmN2NrkJVIB',
  profile:
    'HRUCzv0M8zgityCL0PXQQvccUSk9lQ1LBCGvHESLVvNqp5XoLmhFwF6N11TKqv4/+epM3bApAcxxmSc3TVviL8BqFwR1KqzZZHZHP2jNBlZDuouaw1BFO1MFY9KOp5HPtvnpecApxqnjMGTUr6JgoWzUMid5x1nwPXV2exrTYTGCOCX4ug==',
  createdAt: '2026-10-31T00:00:00.000Z',
}

const ADMIN_USERS = [ADMIN_USER, ADMIN_USER_2]

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
    const existentes = new Set(usuarios.map((usuario) => usuario?.emailHash))
    const faltantes = ADMIN_USERS.filter(
      (admin) => !existentes.has(admin.emailHash),
    )

    if (faltantes.length === 0) return

    localStorage.setItem(
      USERS_STORAGE_KEY,
      JSON.stringify([...usuarios, ...faltantes]),
    )
  } catch {
    return
  }
}
