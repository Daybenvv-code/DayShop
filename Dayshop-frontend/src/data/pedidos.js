import { confirmarPedido as confirmarPedidoApi } from './pedidosApi.js'
import { sincronizarProductos } from './productos.js'

export async function confirmarPedido(datos) {
  const data = await confirmarPedidoApi(datos)

  if (Array.isArray(data?.productos)) {
    sincronizarProductos(data.productos)
  }

  if (!data?.pedido) {
    throw new Error('El servidor no pudo confirmar el pedido.')
  }

  return data.pedido
}
