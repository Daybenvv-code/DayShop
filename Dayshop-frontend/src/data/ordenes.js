import { useSyncExternalStore } from 'react'

export const ORDENES_STORAGE_KEY = 'dayshop:ordenes:v1'
const ORDENES_EVENT = 'dayshop:ordenes-updated'
const SIN_ORDENES = []

let cacheOrdenes = null

function esOrdenValida(orden) {
  return (
    orden &&
    typeof orden === 'object' &&
    typeof orden.numero === 'string' &&
    typeof orden.userId === 'string' &&
    Array.isArray(orden.items) &&
    Number.isFinite(Number(orden.total))
  )
}

function normalizarOrden(orden) {
  const creadaEn =
    typeof orden.creadaEn === 'string'
      ? orden.creadaEn
      : new Date().toISOString()
  const estado =
    typeof orden.estado === 'string' && orden.estado
      ? orden.estado
      : 'confirmado'
  const actualizadaEn =
    typeof orden.actualizadaEn === 'string' ? orden.actualizadaEn : creadaEn
  const historialEstados = Array.isArray(orden.historialEstados)
    ? orden.historialEstados.filter(
        (registro) =>
          registro &&
          typeof registro.estado === 'string' &&
          typeof registro.fecha === 'string',
      )
    : []

  return {
    ...orden,
    estado,
    creadaEn,
    actualizadaEn,
    historialEstados:
      historialEstados.length > 0
        ? historialEstados
        : [{ estado, fecha: actualizadaEn }],
  }
}

function leerOrdenes() {
  try {
    const raw = localStorage.getItem(ORDENES_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(esOrdenValida).map(normalizarOrden)
      : []
  } catch {
    return []
  }
}

export function getOrdenes() {
  if (cacheOrdenes) return cacheOrdenes
  cacheOrdenes = leerOrdenes()
  return cacheOrdenes
}

function persistir(ordenes) {
  try {
    localStorage.setItem(ORDENES_STORAGE_KEY, JSON.stringify(ordenes))
  } catch {
    throw new Error('No se pudo registrar la orden en este navegador.')
  }

  cacheOrdenes = null
  window.dispatchEvent(new Event(ORDENES_EVENT))
}

function generarNumeroOrden(ordenes) {
  const ahora = new Date()
  const fecha = [
    ahora.getFullYear(),
    String(ahora.getMonth() + 1).padStart(2, '0'),
    String(ahora.getDate()).padStart(2, '0'),
  ].join('')

  let numero = ''

  do {
    const aleatorio =
      crypto.randomUUID?.().replace(/-/g, '').slice(0, 6).toUpperCase() ??
      Math.random().toString(36).slice(2, 8).toUpperCase()
    numero = `DS-${fecha}-${aleatorio}`
  } while (ordenes.some((orden) => orden.numero === numero))

  return numero
}

export function crearOrden({
  userId,
  items,
  direccion,
  subtotal,
  costoEnvio,
  total,
}) {
  const ordenes = getOrdenes()
  const creadaEn = new Date().toISOString()

  const orden = {
    numero: generarNumeroOrden(ordenes),
    userId,
    estado: 'confirmado',
    items: items.map((item) => ({ ...item })),
    direccion: direccion ? { ...direccion } : null,
    subtotal: Number(subtotal),
    costoEnvio: Number(costoEnvio),
    total: Number(total),
    creadaEn,
    actualizadaEn: creadaEn,
    historialEstados: [{ estado: 'confirmado', fecha: creadaEn }],
  }

  persistir([orden, ...ordenes])
  return orden
}

export function actualizarEstadoOrden(numero, estado) {
  const ordenes = getOrdenes()
  const orden = ordenes.find((candidata) => candidata.numero === numero)

  if (!orden) return null
  if (orden.estado === estado) return orden

  const actualizadaEn = new Date().toISOString()
  const actualizada = {
    ...orden,
    estado,
    actualizadaEn,
    historialEstados: [
      ...orden.historialEstados,
      { estado, fecha: actualizadaEn },
    ],
  }

  persistir(
    ordenes.map((candidata) =>
      candidata.numero === numero ? actualizada : candidata,
    ),
  )

  return actualizada
}

export function subscribeOrdenes(listener) {
  function invalidar() {
    cacheOrdenes = null
    listener()
  }

  function handleStorage(event) {
    if (event.key !== ORDENES_STORAGE_KEY && event.key !== null) return
    invalidar()
  }

  window.addEventListener(ORDENES_EVENT, invalidar)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(ORDENES_EVENT, invalidar)
    window.removeEventListener('storage', handleStorage)
  }
}

export function useOrdenes() {
  return useSyncExternalStore(subscribeOrdenes, getOrdenes, () => SIN_ORDENES)
}
