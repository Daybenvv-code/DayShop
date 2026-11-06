import { apiRequest } from './apiClient.js'

export function listarDirecciones() {
  return apiRequest('/api/direcciones')
}

export function crearDireccion(direccion) {
  return apiRequest('/api/direcciones', {
    method: 'POST',
    body: JSON.stringify(direccion),
  })
}

export function eliminarDireccion(id) {
  return apiRequest(`/api/direcciones/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
