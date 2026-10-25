import { useSyncExternalStore } from 'react'
import { esProductoActivo, getProductos } from './productos.js'

export const CARRITO_STORAGE_KEY = 'dayshop:carrito:v1'
const CARRITO_EVENT = 'dayshop:carrito-updated'

let cacheCarrito = null

function esItemValido(item) {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.productoId === 'string' &&
    Number.isFinite(Number(item.cantidad)) &&
    Number(item.cantidad) > 0
  )
}

function normalizarItem(item) {
  return {
    productoId: item.productoId,
    cantidad: Math.max(1, Math.trunc(Number(item.cantidad))),
  }
}

export function getCarrito() {
  if (cacheCarrito) return cacheCarrito

  try {
    const raw = localStorage.getItem(CARRITO_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const unicos = new Map()

        for (const item of parsed.filter(esItemValido)) {
          const normalizado = normalizarItem(item)
          const anterior = unicos.get(normalizado.productoId)
          unicos.set(normalizado.productoId, {
            productoId: normalizado.productoId,
            cantidad: (anterior?.cantidad ?? 0) + normalizado.cantidad,
          })
        }

        cacheCarrito = [...unicos.values()]
        return cacheCarrito
      }
    }
  } catch {
    /* Si el almacenamiento falla, se inicia con un carrito vacío. */
  }

  cacheCarrito = []
  return cacheCarrito
}

function guardarCarrito(items) {
  try {
    localStorage.setItem(CARRITO_STORAGE_KEY, JSON.stringify(items))
  } catch {
    throw new Error('No se pudo guardar el carrito en este navegador.')
  }

  cacheCarrito = null
  window.dispatchEvent(new Event(CARRITO_EVENT))
}

export function agregarAlCarrito(productoId, cantidad = 1) {
  const producto = getProductos().find((item) => item.id === productoId)

  if (!producto) {
    throw new Error('Este producto ya no está disponible.')
  }

  if (!esProductoActivo(producto)) {
    throw new Error('Este producto ya no está a la venta.')
  }

  if (producto.stock <= 0) {
    throw new Error('Este producto está agotado.')
  }

  const unidades = Math.max(1, Math.trunc(Number(cantidad) || 1))
  const carrito = getCarrito()
  const existente = carrito.find((item) => item.productoId === productoId)
  const nuevaCantidad = (existente?.cantidad ?? 0) + unidades

  if (nuevaCantidad > producto.stock) {
    throw new Error(
      `Solo hay ${producto.stock} ${
        producto.stock === 1 ? 'unidad disponible' : 'unidades disponibles'
      } de este producto.`,
    )
  }

  const siguiente = existente
    ? carrito.map((item) =>
        item.productoId === productoId
          ? { ...item, cantidad: nuevaCantidad }
          : item,
      )
    : [...carrito, { productoId, cantidad: unidades }]

  guardarCarrito(siguiente)
}

export function agregarVariosAlCarrito(items) {
  const productos = getProductos()
  const carrito = getCarrito()
  const cantidades = new Map(
    carrito.map((item) => [item.productoId, item.cantidad]),
  )
  const agregados = []
  const omitidos = []
  const ajustados = []

  for (const item of items) {
    const producto = productos.find(
      (candidato) => candidato.id === item.productoId,
    )
    const solicitada = Math.max(1, Math.trunc(Number(item.cantidad) || 1))

    if (!producto) {
      omitidos.push({
        productoId: item.productoId,
        titulo: 'Producto no disponible',
        motivo: 'Ya no forma parte del catálogo.',
      })
      continue
    }

    if (!esProductoActivo(producto)) {
      omitidos.push({
        productoId: producto.id,
        titulo: producto.titulo,
        motivo: 'El producto ya no está a la venta.',
      })
      continue
    }

    const existente = cantidades.get(producto.id) ?? 0
    const disponible = Math.max(0, producto.stock - existente)

    if (disponible === 0) {
      omitidos.push({
        productoId: producto.id,
        titulo: producto.titulo,
        motivo:
          producto.stock <= 0
            ? 'El producto está agotado.'
            : 'Ya tienes todas las unidades disponibles en el carrito.',
      })
      continue
    }

    const cantidad = Math.min(solicitada, disponible)
    cantidades.set(producto.id, existente + cantidad)
    agregados.push({
      productoId: producto.id,
      titulo: producto.titulo,
      cantidad,
    })

    if (cantidad < solicitada) {
      ajustados.push({
        productoId: producto.id,
        titulo: producto.titulo,
        solicitada,
        cantidad,
      })
    }
  }

  if (agregados.length === 0) {
    throw new Error(
      'No se pudo agregar ningún producto porque no está disponible o no tiene stock.',
    )
  }

  guardarCarrito(
    [...cantidades.entries()].map(([productoId, cantidad]) => ({
      productoId,
      cantidad,
    })),
  )

  return { agregados, omitidos, ajustados }
}

export function cambiarCantidad(productoId, cantidad) {
  const producto = getProductos().find((item) => item.id === productoId)
  const carrito = getCarrito()
  const existente = carrito.find((item) => item.productoId === productoId)

  if (!existente) return

  const numero = Math.trunc(Number(cantidad))

  if (
    !producto ||
    !esProductoActivo(producto) ||
    !Number.isFinite(numero) ||
    numero <= 0
  ) {
    guardarCarrito(
      carrito.filter((item) => item.productoId !== productoId),
    )
    return
  }

  const cantidadFinal = Math.max(1, Math.min(numero, producto.stock))

  if (cantidadFinal === existente.cantidad) return

  guardarCarrito(
    carrito.map((item) =>
      item.productoId === productoId
        ? { ...item, cantidad: cantidadFinal }
        : item,
    ),
  )
}

export function aumentarCantidad(productoId) {
  const existente = getCarrito().find((item) => item.productoId === productoId)
  if (!existente) return
  cambiarCantidad(productoId, existente.cantidad + 1)
}

export function reducirCantidad(productoId) {
  const existente = getCarrito().find((item) => item.productoId === productoId)
  if (!existente) return
  cambiarCantidad(productoId, existente.cantidad - 1)
}

export function eliminarDelCarrito(productoId) {
  guardarCarrito(
    getCarrito().filter((item) => item.productoId !== productoId),
  )
}

export function vaciarCarrito() {
  guardarCarrito([])
}

export function subscribeCarrito(listener) {
  function invalidar() {
    cacheCarrito = null
    listener()
  }

  function handleStorage(event) {
    if (event.key !== CARRITO_STORAGE_KEY && event.key !== null) return
    invalidar()
  }

  window.addEventListener(CARRITO_EVENT, invalidar)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(CARRITO_EVENT, invalidar)
    window.removeEventListener('storage', handleStorage)
  }
}

export function useCarrito() {
  return useSyncExternalStore(subscribeCarrito, getCarrito, getCarrito)
}

export function useCantidadCarrito() {
  const carrito = useCarrito()
  return carrito.reduce((total, item) => total + item.cantidad, 0)
}
