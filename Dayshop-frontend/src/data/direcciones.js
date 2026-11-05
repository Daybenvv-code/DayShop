import { useEffect, useSyncExternalStore } from 'react'
import { normalizarDireccion } from '../../shared/direcciones.js'
import {
  crearDireccion as crearDireccionApi,
  eliminarDireccion as eliminarDireccionApi,
  listarDirecciones,
} from './direccionesApi.js'

const SIN_DIRECCIONES = []
const ESTADO_INICIAL = {
  userId: null,
  direcciones: SIN_DIRECCIONES,
  cargando: false,
  cargado: false,
  error: '',
}

let estado = ESTADO_INICIAL
let peticion = null
let solicitudId = 0
const listeners = new Set()

function emitir() {
  for (const listener of listeners) listener()
}

function actualizar(cambios) {
  estado = { ...estado, ...cambios }
  emitir()
}

function listaDe(userId) {
  return estado.userId === userId ? estado.direcciones : SIN_DIRECCIONES
}

export function getDirecciones(userId) {
  return listaDe(userId)
}

export async function cargarDirecciones(userId, { force = false } = {}) {
  if (!userId) return SIN_DIRECCIONES

  if (!force && estado.userId === userId && estado.cargando) return peticion
  if (!force && estado.userId === userId && estado.cargado) {
    return estado.direcciones
  }

  actualizar({
    userId,
    direcciones: estado.userId === userId ? estado.direcciones : SIN_DIRECCIONES,
    cargando: true,
    error: '',
  })

  const id = ++solicitudId

  peticion = listarDirecciones()
    .then((data) => {
      const direcciones = Array.isArray(data?.direcciones)
        ? data.direcciones
        : []

      if (id === solicitudId && estado.userId === userId) {
        actualizar({
          userId,
          direcciones,
          cargando: false,
          cargado: true,
          error: '',
        })
      }

      return direcciones
    })
    .catch((error) => {
      if (id === solicitudId && estado.userId === userId) {
        actualizar({
          userId,
          cargando: false,
          cargado: false,
          error:
            error?.message ||
            'No se pudieron cargar las direcciones guardadas.',
        })
      }

      throw error
    })
    .finally(() => {
      if (id === solicitudId) peticion = null
    })

  return peticion
}

export async function guardarDireccion(userId, datos) {
  const data = await crearDireccionApi(normalizarDireccion(datos))
  const direccion = data?.direccion

  if (!direccion) {
    throw new Error('El servidor no devolvió la dirección guardada.')
  }

  const direcciones = [
    direccion,
    ...listaDe(userId).filter((item) => item.id !== direccion.id),
  ]

  actualizar({ userId, direcciones, cargado: true, error: '' })
  return direccion
}

export async function eliminarDireccion(userId, direccionId) {
  await eliminarDireccionApi(direccionId)

  actualizar({
    userId,
    direcciones: listaDe(userId).filter(
      (direccion) => direccion.id !== direccionId,
    ),
  })
}

export function limpiarDirecciones() {
  solicitudId += 1
  estado = ESTADO_INICIAL
  peticion = null
  emitir()
}

export function subscribeDirecciones(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDireccionesEstado(userId) {
  const snapshot = useSyncExternalStore(
    subscribeDirecciones,
    () => estado,
    () => estado,
  )

  useEffect(() => {
    if (!userId) return
    cargarDirecciones(userId).catch(() => {})
  }, [userId])

  const propio = snapshot.userId === userId

  return {
    direcciones: propio ? snapshot.direcciones : SIN_DIRECCIONES,
    cargando: propio ? snapshot.cargando : false,
    error: propio ? snapshot.error : '',
  }
}

export function useDirecciones(userId) {
  return useDireccionesEstado(userId).direcciones
}
