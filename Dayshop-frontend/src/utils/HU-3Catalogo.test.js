import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  agruparProductosPorCategoria,
  CATALOGO_GRID_CLASSES,
  getDestinoDetalleProducto,
  getDetalleProducto,
  getEstadoStock,
  getTarjetaProducto,
  obtenerProductoPorId,
} from './HU-3Catalogo.js'
import {
  actualizarProducto,
  crearProducto,
  getProductos,
  sincronizarProductos,
} from '../data/productos.js'
import * as productosApi from '../data/productosApi.js'

vi.mock('../data/productosApi.js', () => ({
  listarProductos: vi.fn(),
  crearProducto: vi.fn(),
  actualizarProducto: vi.fn(),
  cambiarDisponibilidadProducto: vi.fn(),
  eliminarProducto: vi.fn(),
}))

const PRODUCTO = {
  id: 'audifonos-pro',
  titulo: 'Audífonos inalámbricos Pro',
  categoria: 'tecnologia',
  precio: 249.9,
  stock: 5,
  imagen: 'https://example.com/audifonos.png',
  descripcion:
    'Audífonos con cancelación activa de ruido y estuche de carga.',
  especificaciones: {
    Conectividad: 'Bluetooth 5.3',
    Autonomía: 'Hasta 30 horas',
  },
  activo: true,
}

describe('US-x catálogo: presentación y actualización', () => {
  it('1. agrupa los productos por categoría en el orden del catálogo', () => {
    const lampara = {
      ...PRODUCTO,
      id: 'lampara-nordic',
      titulo: 'Lámpara Nordic',
      categoria: 'hogar',
    }
    const categoriaInvalida = {
      ...PRODUCTO,
      id: 'sin-categoria',
      categoria: 'inexistente',
    }

    const grupos = agruparProductosPorCategoria([
      lampara,
      PRODUCTO,
      categoriaInvalida,
    ])

    expect(grupos.map((grupo) => grupo.id)).toEqual(['tecnologia', 'hogar'])
    expect(grupos[0].productos.map((producto) => producto.id)).toEqual([
      'audifonos-pro',
    ])
    expect(grupos[1].productos.map((producto) => producto.id)).toEqual([
      'lampara-nordic',
    ])
    expect(
      grupos
        .flatMap((grupo) => grupo.productos)
        .some((producto) => producto.id === 'sin-categoria'),
    ).toBe(false)
  })

  it('2. la tarjeta incluye imagen, título y precio claro en soles', () => {
    const tarjeta = getTarjetaProducto(PRODUCTO)

    expect(tarjeta.titulo).toBe('Audífonos inalámbricos Pro')
    expect(tarjeta.imagen).toBe('https://example.com/audifonos.png')
    expect(tarjeta.precioTexto).toBe('S/. 249.90')
    expect(tarjeta.categoria).toBe('Tecnología')

    const sinImagen = getTarjetaProducto({ ...PRODUCTO, imagen: '' })
    expect(sinImagen.imagen).toBeTruthy()
  })

  it('3. indica el estado del stock en la tarjeta', () => {
    expect(getEstadoStock(PRODUCTO)).toEqual({
      activo: true,
      disponible: true,
      etiqueta: 'Disponible',
      stock: 5,
    })

    expect(getEstadoStock({ ...PRODUCTO, stock: 0 })).toMatchObject({
      disponible: false,
      etiqueta: 'Agotado',
      stock: 0,
    })

    expect(getEstadoStock({ ...PRODUCTO, activo: false })).toMatchObject({
      disponible: false,
      etiqueta: 'No disponible',
    })
  })

  it('4. obtiene el detalle completo y el destino de navegación', () => {
    const productos = [PRODUCTO]

    expect(obtenerProductoPorId(productos, PRODUCTO.id)).toBe(PRODUCTO)
    expect(obtenerProductoPorId(productos, 'no-existe')).toBeNull()

    const detalle = getDetalleProducto(PRODUCTO)
    expect(detalle.descripcion).toContain('cancelación activa de ruido')
    expect(detalle.especificaciones).toEqual({
      Conectividad: 'Bluetooth 5.3',
      Autonomía: 'Hasta 30 horas',
    })
    expect(detalle.precioTexto).toBe('S/. 249.90')

    expect(getDestinoDetalleProducto(PRODUCTO.id)).toEqual({
      screen: 'catalogo',
      selectedProductId: PRODUCTO.id,
    })
  })

  beforeEach(() => {
    sincronizarProductos([])
    vi.clearAllMocks()
  })

  it('5. actualiza la lista cuando se agrega o edita un producto', async () => {
    const nuevo = {
      ...PRODUCTO,
      id: 'producto-nuevo',
      titulo: 'Producto nuevo',
    }

    productosApi.crearProducto.mockResolvedValue({
      producto: nuevo,
      productos: [nuevo],
    })

    await crearProducto({ titulo: 'Producto nuevo' })

    expect(productosApi.crearProducto).toHaveBeenCalledTimes(1)
    expect(getProductos()).toEqual([
      expect.objectContaining({
        id: 'producto-nuevo',
        titulo: 'Producto nuevo',
      }),
    ])

    const editado = { ...nuevo, titulo: 'Producto editado' }
    productosApi.actualizarProducto.mockResolvedValue({
      producto: editado,
      productos: [editado],
    })

    await actualizarProducto('producto-nuevo', {
      titulo: 'Producto editado',
    })

    expect(productosApi.actualizarProducto).toHaveBeenCalledWith(
      'producto-nuevo',
      { titulo: 'Producto editado' },
    )
    expect(getProductos()[0].titulo).toBe('Producto editado')
  })

  it('6. usa una cuadrícula adaptable a pantallas móviles', () => {
    expect(CATALOGO_GRID_CLASSES).toContain('grid-cols-1')
    expect(CATALOGO_GRID_CLASSES).toContain('sm:grid-cols-2')
    expect(CATALOGO_GRID_CLASSES).toContain('lg:grid-cols-3')
    expect(CATALOGO_GRID_CLASSES).toContain('xl:grid-cols-4')
  })
})
