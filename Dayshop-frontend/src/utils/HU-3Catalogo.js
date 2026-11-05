import { CATEGORIAS, normalizarProducto } from '../../shared/catalog.js'
import {
  esProductoActivo,
  formatearPrecio,
  obtenerCategoria,
} from '../data/productos.js'

export const CATALOGO_GRID_CLASSES =
  'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

export function agruparProductosPorCategoria(productos) {
  const lista = Array.isArray(productos) ? productos : []

  return CATEGORIAS.map((categoria) => ({
    ...categoria,
    productos: lista.filter(
      (producto) => producto?.categoria === categoria.id,
    ),
  })).filter((categoria) => categoria.productos.length > 0)
}

export function getEstadoStock(producto) {
  const activo = esProductoActivo(producto)
  const stock = Number(producto?.stock)
  const stockNormalizado = Number.isFinite(stock)
    ? Math.max(0, Math.trunc(stock))
    : 0
  const disponible = activo && stockNormalizado > 0

  return {
    activo,
    disponible,
    etiqueta: !activo
      ? 'No disponible'
      : disponible
        ? 'Disponible'
        : 'Agotado',
    stock: stockNormalizado,
  }
}

export function getTarjetaProducto(producto) {
  const normalizado = normalizarProducto(producto)
  const categoria = obtenerCategoria(normalizado.categoria)

  return {
    id: normalizado.id,
    titulo: normalizado.titulo,
    imagen: normalizado.imagen,
    precioTexto: formatearPrecio(normalizado.precio),
    categoria: categoria.nombre,
    estadoStock: getEstadoStock(normalizado),
  }
}

export function obtenerProductoPorId(productos, id) {
  if (!Array.isArray(productos)) return null

  return productos.find((producto) => producto?.id === id) ?? null
}

export function getDetalleProducto(producto) {
  if (!producto) return null

  const normalizado = normalizarProducto(producto)
  const categoria = obtenerCategoria(normalizado.categoria)

  return {
    id: normalizado.id,
    titulo: normalizado.titulo,
    descripcion: normalizado.descripcion,
    especificaciones: normalizado.especificaciones,
    precioTexto: formatearPrecio(normalizado.precio),
    imagen: normalizado.imagen,
    categoria: categoria.nombre,
    estadoStock: getEstadoStock(normalizado),
  }
}

export function getDestinoDetalleProducto(productoId) {
  return {
    screen: 'catalogo',
    selectedProductId: productoId,
  }
}
