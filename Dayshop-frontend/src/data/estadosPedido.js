export const ESTADOS_PEDIDO = {
  confirmado: {
    id: 'confirmado',
    titulo: 'Confirmado',
    grupo: 'activo',
    descripcion: 'Tu pedido fue recibido y está pendiente de preparación.',
  },
  preparando: {
    id: 'preparando',
    titulo: 'Preparando',
    grupo: 'activo',
    descripcion: 'Estamos empacando los productos de tu pedido.',
  },
  en_camino: {
    id: 'en_camino',
    titulo: 'En camino',
    grupo: 'activo',
    descripcion: 'Tu pedido está en ruta hacia la dirección de entrega.',
  },
  entregado: {
    id: 'entregado',
    titulo: 'Completado',
    grupo: 'completado',
    descripcion: 'El pedido fue entregado correctamente.',
  },
  cancelado: {
    id: 'cancelado',
    titulo: 'Cancelado',
    grupo: 'cancelado',
    descripcion: 'El pedido fue cancelado y no se realizará la entrega.',
  },
}

const ESTADO_POR_DEFECTO = {
  id: 'desconocido',
  titulo: 'Sin estado',
  grupo: 'activo',
  descripcion: 'No se pudo determinar el estado del pedido.',
}

export function obtenerEstadoPedido(id) {
  return ESTADOS_PEDIDO[id] ?? ESTADO_POR_DEFECTO
}

export function pedidoEstaCompletado(orden) {
  return obtenerEstadoPedido(orden?.estado).grupo === 'completado'
}

export function pedidoEstaCancelado(orden) {
  return obtenerEstadoPedido(orden?.estado).grupo === 'cancelado'
}
