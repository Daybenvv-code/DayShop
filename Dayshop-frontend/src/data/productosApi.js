import { apiRequest } from './apiClient.js'

export async function listarProductos() {
  const data = await apiRequest('/api/productos')
  return Array.isArray(data?.productos) ? data.productos : []
}

export function crearProducto(datos) {
  return apiRequest('/api/productos', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export function actualizarProducto(id, datos) {
  return apiRequest(`/api/productos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

export function cambiarDisponibilidadProducto(id, activo) {
  return apiRequest(
    `/api/productos/${encodeURIComponent(id)}/disponibilidad`,
    {
      method: 'PATCH',
      body: JSON.stringify({ activo }),
    },
  )
}

export function eliminarProducto(id) {
  return apiRequest(`/api/productos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
