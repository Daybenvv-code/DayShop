import { apiRequest } from './apiClient.js'

export function confirmarPedido(datos) {
  return apiRequest('/api/pedidos/confirmar', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}
