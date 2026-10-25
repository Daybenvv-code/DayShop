import { useSyncExternalStore } from 'react'

export const DIRECCIONES_STORAGE_KEY = 'dayshop:direcciones:v1'
const DIRECCIONES_EVENT = 'dayshop:direcciones-updated'
const SIN_DIRECCIONES = []

let cacheDirecciones = null

function esDireccionValida(direccion) {
  return (
    direccion &&
    typeof direccion === 'object' &&
    typeof direccion.id === 'string' &&
    typeof direccion.direccion === 'string' &&
    typeof direccion.referencia === 'string' &&
    typeof direccion.ciudad === 'string' &&
    typeof direccion.celular === 'string'
  )
}

function normalizarDireccion(direccion) {
  return {
    id: direccion.id,
    alias: typeof direccion.alias === 'string' ? direccion.alias : '',
    direccion: direccion.direccion,
    referencia: direccion.referencia,
    ciudad: direccion.ciudad,
    celular: direccion.celular,
    creadaEn: typeof direccion.creadaEn === 'string' ? direccion.creadaEn : '',
  }
}

function leerTodas() {
  try {
    const raw = localStorage.getItem(DIRECCIONES_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

function construirCache() {
  const resultado = {}

  for (const [userId, lista] of Object.entries(leerTodas())) {
    if (Array.isArray(lista)) {
      resultado[userId] = lista
        .filter(esDireccionValida)
        .map(normalizarDireccion)
    }
  }

  return resultado
}

function getCache() {
  if (!cacheDirecciones) cacheDirecciones = construirCache()
  return cacheDirecciones
}

export function getDirecciones(userId) {
  return getCache()[userId] ?? SIN_DIRECCIONES
}

function persistir(todas) {
  try {
    localStorage.setItem(DIRECCIONES_STORAGE_KEY, JSON.stringify(todas))
  } catch {
    throw new Error('No se pudo guardar la dirección en este navegador.')
  }

  cacheDirecciones = null
  window.dispatchEvent(new Event(DIRECCIONES_EVENT))
}

export function guardarDireccion(userId, datos) {
  const direccion = {
    id: crypto.randomUUID?.() ?? `direccion-${Date.now()}`,
    alias: (datos.alias ?? '').trim(),
    direccion: datos.direccion.trim(),
    referencia: datos.referencia.trim(),
    ciudad: datos.ciudad,
    celular: datos.celular.trim(),
    creadaEn: new Date().toISOString(),
  }

  persistir({
    ...getCache(),
    [userId]: [direccion, ...getDirecciones(userId)],
  })

  return direccion
}

export function eliminarDireccion(userId, direccionId) {
  persistir({
    ...getCache(),
    [userId]: getDirecciones(userId).filter(
      (direccion) => direccion.id !== direccionId,
    ),
  })
}

export function subscribeDirecciones(listener) {
  function invalidar() {
    cacheDirecciones = null
    listener()
  }

  function handleStorage(event) {
    if (event.key !== DIRECCIONES_STORAGE_KEY && event.key !== null) return
    invalidar()
  }

  window.addEventListener(DIRECCIONES_EVENT, invalidar)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(DIRECCIONES_EVENT, invalidar)
    window.removeEventListener('storage', handleStorage)
  }
}

export function useDirecciones(userId) {
  return useSyncExternalStore(
    subscribeDirecciones,
    () => getDirecciones(userId),
    () => SIN_DIRECCIONES,
  )
}
