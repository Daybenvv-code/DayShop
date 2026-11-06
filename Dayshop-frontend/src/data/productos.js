import { useSyncExternalStore } from 'react'
import {
  CATEGORIAS,
  PRODUCTOS_PREDETERMINADOS,
  esProductoValido,
  normalizarProducto,
} from '../../shared/catalog.js'
import * as productosApi from './productosApi.js'

export { CATEGORIAS, PRODUCTOS_PREDETERMINADOS } from '../../shared/catalog.js'

let cacheProductos = PRODUCTOS_PREDETERMINADOS.map(normalizarProducto)
let productosCargados = false
let cargaEnCurso = null
let sincronizacionIniciada = false
let intervalo = null
let canal = null

const listeners = new Set()

function emitir() {
  for (const listener of listeners) listener()
}

function aplicarProductos(productos) {
  if (!Array.isArray(productos)) return
  cacheProductos = productos.filter(esProductoValido).map(normalizarProducto)
  productosCargados = true
}

function actualizarDesdeRespuesta(data) {
  if (Array.isArray(data?.productos)) aplicarProductos(data.productos)
  return data?.producto ? normalizarProducto(data.producto) : null
}

function notificarCambio() {
  emitir()
  canal?.postMessage('productos-actualizados')
}

function refrescarProductos() {
  if (document.visibilityState === 'hidden') return
  cargarProductos({ force: true }).catch(() => {})
}

function manejarVisibilidad() {
  if (document.visibilityState === 'visible') refrescarProductos()
}

function iniciarSincronizacion() {
  if (sincronizacionIniciada) return
  sincronizacionIniciada = true

  cargarProductos({ force: true }).catch(() => {})

  window.addEventListener('focus', refrescarProductos)
  document.addEventListener('visibilitychange', manejarVisibilidad)
  intervalo = window.setInterval(refrescarProductos, 15_000)

  if (typeof BroadcastChannel !== 'undefined') {
    canal = new BroadcastChannel('dayshop:productos')
    canal.onmessage = refrescarProductos
  }
}

function detenerSincronizacion() {
  if (!sincronizacionIniciada || listeners.size > 0) return
  sincronizacionIniciada = false

  window.removeEventListener('focus', refrescarProductos)
  document.removeEventListener('visibilitychange', manejarVisibilidad)
  if (intervalo) window.clearInterval(intervalo)
  intervalo = null

  if (canal) {
    canal.close()
    canal = null
  }
}

export function esProductoActivo(producto) {
  return producto?.activo !== false
}

export function getProductos() {
  return cacheProductos
}

export function cargarProductos({ force = false } = {}) {
  if (cargaEnCurso) return cargaEnCurso
  if (productosCargados && !force) return Promise.resolve(cacheProductos)

  cargaEnCurso = productosApi
    .listarProductos()
    .then((productos) => {
      aplicarProductos(productos)
      emitir()
      return cacheProductos
    })
    .finally(() => {
      cargaEnCurso = null
    })

  return cargaEnCurso
}

export async function crearProducto(datos) {
  const data = await productosApi.crearProducto(datos)
  const producto = actualizarDesdeRespuesta(data)
  notificarCambio()
  return producto
}

export async function actualizarProducto(id, datos) {
  const data = await productosApi.actualizarProducto(id, datos)
  const producto = actualizarDesdeRespuesta(data)
  notificarCambio()
  return producto
}

export async function cambiarDisponibilidadProducto(id, activo) {
  const data = await productosApi.cambiarDisponibilidadProducto(id, activo)
  const producto = actualizarDesdeRespuesta(data)
  notificarCambio()
  return producto
}

export function sincronizarProductos(productos) {
  aplicarProductos(productos)
  notificarCambio()
}

export async function eliminarProducto(id) {
  const data = await productosApi.eliminarProducto(id)
  actualizarDesdeRespuesta(data)
  notificarCambio()
}

export function subscribeProductos(listener) {
  listeners.add(listener)
  iniciarSincronizacion()

  return () => {
    listeners.delete(listener)
    detenerSincronizacion()
  }
}

export function useProductos() {
  return useSyncExternalStore(subscribeProductos, getProductos, getProductos)
}

export function obtenerCategoria(id) {
  return CATEGORIAS.find((categoria) => categoria.id === id) ?? CATEGORIAS[0]
}

export function formatearPrecio(valor) {
  return `S/. ${Number(valor).toFixed(2)}`
}
