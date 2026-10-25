export const ESTADOS_SEGUIMIENTO = [
  {
    id: 'confirmado',
    titulo: 'Pedido confirmado',
    descripcion: 'Recibimos tu compra y reservamos tus productos.',
    inicioSegundos: 0,
  },
  {
    id: 'preparando',
    titulo: 'Preparando tu pedido',
    descripcion: 'Estamos empacando tus productos para el reparto.',
    inicioSegundos: 30,
  },
  {
    id: 'en_camino',
    titulo: 'En camino',
    descripcion: 'Tu pedido salió del almacén y va hacia tu dirección.',
    inicioSegundos: 75,
  },
  {
    id: 'entregado',
    titulo: 'Entregado',
    descripcion: 'Tu pedido llegó a la dirección registrada.',
    inicioSegundos: 120,
  },
]

export const TIEMPO_TOTAL_ENTREGA_SEGUNDOS = 120

export function obtenerEstadoSeguimiento(id) {
  return (
    ESTADOS_SEGUIMIENTO.find((estado) => estado.id === id) ??
    ESTADOS_SEGUIMIENTO[0]
  )
}

export function obtenerIndiceEstadoPorTiempo(creadaEn, ahora = Date.now()) {
  const creada = new Date(creadaEn).getTime()
  if (!Number.isFinite(creada)) return 0

  const transcurridoSegundos = Math.max(0, (ahora - creada) / 1000)
  let indice = 0

  ESTADOS_SEGUIMIENTO.forEach((estado, posicion) => {
    if (transcurridoSegundos >= estado.inicioSegundos) indice = posicion
  })

  return indice
}

export function obtenerFechaEtapa(orden, estado) {
  const registro = Array.isArray(orden?.historialEstados)
    ? orden.historialEstados.find((item) => item.estado === estado.id)
    : null

  if (registro?.fecha) {
    const fechaRegistrada = new Date(registro.fecha)
    if (!Number.isNaN(fechaRegistrada.getTime())) return fechaRegistrada
  }

  const creada = new Date(orden?.creadaEn)
  if (Number.isNaN(creada.getTime())) return null

  return new Date(creada.getTime() + estado.inicioSegundos * 1000)
}

export function obtenerEntregaEstimada(orden) {
  const creada = new Date(orden?.creadaEn)
  if (Number.isNaN(creada.getTime())) return null

  return new Date(creada.getTime() + TIEMPO_TOTAL_ENTREGA_SEGUNDOS * 1000)
}
