import { CATEGORIAS, esProductoActivo } from '../data/productos.js'

export function obtenerProductosVisibles(productos) {
  return productos.filter(esProductoActivo)
}

export function agruparProductosPorCategoria(productos, categorias = CATEGORIAS) {
  return categorias
    .map((categoria) => ({
      ...categoria,
      productos: productos.filter(
        (producto) => producto.categoria === categoria.id,
      ),
    }))
    .filter((categoria) => categoria.productos.length > 0)
}

export function obtenerEstadoStock(producto) {
  const activo = esProductoActivo(producto)
  const disponible = activo && Number(producto?.stock) > 0

  return {
    activo,
    disponible,
    etiqueta: !activo
      ? 'No disponible'
      : disponible
        ? 'Disponible'
        : 'Agotado',
    detalle: !activo
      ? 'No disponible'
      : disponible
        ? `${producto.stock} en stock`
        : 'Sin stock',
  }
}
