import { useSyncExternalStore } from 'react'

export const PRODUCTOS_STORAGE_KEY = 'dayshop:productos:v1'
const PRODUCTOS_EVENT = 'dayshop:productos-updated'

export const CATEGORIAS = [
  {
    id: 'tecnologia',
    nombre: 'Tecnología',
    descripcion: 'Audio, wearables y accesorios para tu día a día.',
  },
  {
    id: 'hogar',
    nombre: 'Hogar',
    descripcion: 'Piezas funcionales y cálidas para tu espacio.',
  },
  {
    id: 'moda',
    nombre: 'Moda',
    descripcion: 'Básicos versátiles para cualquier ocasión.',
  },
  {
    id: 'deportes',
    nombre: 'Deportes',
    descripcion: 'Equipo ligero para entrenar sin límites.',
  },
]

function crearImagen(emoji, desde, hasta, acento) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${desde}"/>
      <stop offset="1" stop-color="${hasta}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="480" fill="url(#fondo)"/>
  <circle cx="552" cy="72" r="128" fill="${acento}" opacity="0.28"/>
  <circle cx="88" cy="430" r="158" fill="#ffffff" opacity="0.12"/>
  <text x="320" y="275" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif" font-size="196" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const IMAGEN_PREDETERMINADA = crearImagen('🛍️', '#4f46e5', '#0ea5e9', '#fbbf24')

export const PRODUCTOS_PREDETERMINADOS = [
  {
    id: 'audifonos-wireless-pro',
    titulo: 'Audífonos inalámbricos Pro',
    categoria: 'tecnologia',
    precio: 249.9,
    stock: 18,
    imagen: crearImagen('🎧', '#4338ca', '#0ea5e9', '#a5b4fc'),
    descripcion:
      'Audífonos con cancelación activa de ruido, sonido envolvente y estuche de carga para acompañarte durante todo el día.',
    especificaciones: {
      Conectividad: 'Bluetooth 5.3',
      Autonomía: 'Hasta 30 horas con estuche',
      'Cancelación de ruido': 'Activa híbrida',
      Garantía: '12 meses',
    },
  },
  {
    id: 'smartwatch-dayfit',
    titulo: 'Smartwatch DayFit',
    categoria: 'tecnologia',
    precio: 389,
    stock: 0,
    imagen: crearImagen('⌚', '#0f766e', '#06b6d4', '#99f6e4'),
    descripcion:
      'Reloj inteligente con monitoreo de actividad, frecuencia cardíaca y notificaciones. Pantalla brillante y resistencia al agua para tu rutina.',
    especificaciones: {
      Pantalla: 'AMOLED 1.8"',
      'Resistencia al agua': '5 ATM',
      Batería: 'Hasta 10 días',
      Compatibilidad: 'Android e iOS',
    },
  },
  {
    id: 'parlante-bluetooth-mini',
    titulo: 'Parlante Bluetooth Mini',
    categoria: 'tecnologia',
    precio: 129.9,
    stock: 7,
    imagen: crearImagen('🔊', '#7c3aed', '#ec4899', '#f9a8d4'),
    descripcion:
      'Parlante portátil con sonido potente, diseño compacto y batería recargable. Ideal para reuniones, viajes y actividades al aire libre.',
    especificaciones: {
      Potencia: '20 W',
      Conectividad: 'Bluetooth 5.2',
      'Resistencia al agua': 'IPX7',
      Autonomía: 'Hasta 12 horas',
    },
  },
  {
    id: 'lampara-escritorio-nordic',
    titulo: 'Lámpara de escritorio Nordic',
    categoria: 'hogar',
    precio: 89.9,
    stock: 12,
    imagen: crearImagen('💡', '#f59e0b', '#fbbf24', '#fde68a'),
    descripcion:
      'Lámpara de diseño minimalista con luz cálida regulable. Su brazo articulado y base estable la hacen perfecta para estudiar o trabajar.',
    especificaciones: {
      Material: 'Aluminio y ABS',
      Iluminación: 'LED regulable',
      Temperatura: '3000 K - 5500 K',
      Alimentación: 'USB-C',
    },
  },
  {
    id: 'cafetera-goteo-compacta',
    titulo: 'Cafetera de goteo Compacta',
    categoria: 'hogar',
    precio: 219,
    stock: 4,
    imagen: crearImagen('☕', '#92400e', '#f59e0b', '#fcd34d'),
    descripcion:
      'Cafetera de goteo para preparar hasta 6 tazas. Incluye jarra de vidrio templado, placa térmica y filtro permanente lavable.',
    especificaciones: {
      Capacidad: '6 tazas (750 ml)',
      Potencia: '650 W',
      Material: 'Acero inoxidable',
      Filtro: 'Permanente lavable',
    },
  },
  {
    id: 'juego-tazas-ceramica',
    titulo: 'Juego de tazas de cerámica',
    categoria: 'hogar',
    precio: 59.9,
    stock: 0,
    imagen: crearImagen('🍵', '#0e7490', '#14b8a6', '#a5f3fc'),
    descripcion:
      'Set de cuatro tazas de cerámica esmaltada con acabado artesanal. Aptas para bebidas frías y calientes, y para lavavajillas.',
    especificaciones: {
      Piezas: '4 tazas',
      Capacidad: '350 ml cada una',
      Material: 'Cerámica esmaltada',
      'Apta para microondas': 'Sí',
    },
  },
  {
    id: 'mochila-urbana-impermeable',
    titulo: 'Mochila urbana Impermeable',
    categoria: 'moda',
    precio: 159.9,
    stock: 25,
    imagen: crearImagen('🎒', '#1e293b', '#475569', '#94a3b8'),
    descripcion:
      'Mochila de tejido impermeable con compartimento acolchado para laptop, bolsillos laterales y correas ergonómicas para el uso diario.',
    especificaciones: {
      Capacidad: '22 litros',
      Material: 'Poliéster impermeable',
      'Compartimento laptop': 'Hasta 15.6"',
      Garantía: '6 meses',
    },
  },
  {
    id: 'zapatillas-running-air',
    titulo: 'Zapatillas Running Air',
    categoria: 'deportes',
    precio: 299,
    stock: 9,
    imagen: crearImagen('👟', '#dc2626', '#f97316', '#fed7aa'),
    descripcion:
      'Zapatillas ligeras con entresuela amortiguada y malla transpirable. Diseñadas para entrenamientos diarios y carreras de media distancia.',
    especificaciones: {
      Tipo: 'Running neutral',
      Amortiguación: 'Espuma de alta rebote',
      Peso: '245 g (talla 40)',
      'Suela exterior': 'Caucho antideslizante',
    },
  },
  {
    id: 'botella-termica-750',
    titulo: 'Botella térmica 750 ml',
    categoria: 'deportes',
    precio: 69.9,
    stock: 30,
    imagen: crearImagen('🥤', '#0284c7', '#22d3ee', '#bae6fd'),
    descripcion:
      'Botella de acero inoxidable que mantiene tus bebidas frías o calientes por horas. Tapa de cierre hermético y diseño libre de BPA.',
    especificaciones: {
      Capacidad: '750 ml',
      Material: 'Acero inoxidable 18/8',
      'Conservación en frío': 'Hasta 24 horas',
      'Conservación en caliente': 'Hasta 12 horas',
    },
  },
  {
    id: 'casaca-cortavientos',
    titulo: 'Casaca ligera cortavientos',
    categoria: 'moda',
    precio: 189.9,
    stock: 3,
    imagen: crearImagen('🧥', '#4f46e5', '#8b5cf6', '#ddd6fe'),
    descripcion:
      'Casaca compacta que bloquea el viento y resiste salpicaduras. Se guarda en su propio bolsillo y es ideal para cambios de clima.',
    especificaciones: {
      Material: 'Nylon ripstop',
      Cierre: 'Cremallera frontal',
      Bolsillos: '2 laterales con cierre',
      Cuidado: 'Lavado a mano',
    },
  },
]

let cacheProductos = null

function esProductoValido(producto) {
  return (
    producto &&
    typeof producto === 'object' &&
    typeof producto.id === 'string' &&
    typeof producto.titulo === 'string' &&
    typeof producto.categoria === 'string' &&
    Number.isFinite(Number(producto.precio)) &&
    Number.isFinite(Number(producto.stock))
  )
}

function normalizarProducto(producto) {
  const categoriaExiste = CATEGORIAS.some(
    (categoria) => categoria.id === producto.categoria,
  )

  return {
    id: String(producto.id),
    titulo: String(producto.titulo).trim(),
    categoria: categoriaExiste ? producto.categoria : CATEGORIAS[0].id,
    precio: Math.max(0, Number(producto.precio)),
    stock: Math.max(0, Math.trunc(Number(producto.stock))),
    imagen:
      typeof producto.imagen === 'string' && producto.imagen.trim()
        ? producto.imagen.trim()
        : IMAGEN_PREDETERMINADA,
    descripcion:
      typeof producto.descripcion === 'string' ? producto.descripcion.trim() : '',
    activo: producto.activo !== false,
    especificaciones:
      producto.especificaciones &&
      typeof producto.especificaciones === 'object' &&
      !Array.isArray(producto.especificaciones)
        ? producto.especificaciones
        : {},
  }
}

function clonarProducto(producto) {
  return { ...producto, especificaciones: { ...producto.especificaciones } }
}

export function esProductoActivo(producto) {
  return producto?.activo !== false
}

export function getProductos() {
  if (cacheProductos) return cacheProductos

  try {
    const raw = localStorage.getItem(PRODUCTOS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        cacheProductos = parsed.filter(esProductoValido).map(normalizarProducto)
        return cacheProductos
      }
    }
  } catch {
    /* Si el almacenamiento falla, se usan los productos de demostración. */
  }

  cacheProductos = PRODUCTOS_PREDETERMINADOS.map(clonarProducto)
  return cacheProductos
}

function guardarProductos(productos) {
  try {
    localStorage.setItem(PRODUCTOS_STORAGE_KEY, JSON.stringify(productos))
  } catch {
    throw new Error('No se pudo guardar el producto en este navegador.')
  }

  cacheProductos = null
  window.dispatchEvent(new Event(PRODUCTOS_EVENT))
}

export function crearProducto(datos) {
  const producto = normalizarProducto({
    ...datos,
    id: crypto.randomUUID?.() ?? `producto-${Date.now()}`,
  })

  guardarProductos([...getProductos(), producto])
  return producto
}

export function actualizarProducto(id, datos) {
  const productos = getProductos()
  const existente = productos.find((producto) => producto.id === id)

  if (!existente) {
    throw new Error('El producto ya no existe en el catálogo.')
  }

  const actualizado = normalizarProducto({ ...existente, ...datos, id })
  guardarProductos(
    productos.map((producto) => (producto.id === id ? actualizado : producto)),
  )
  return actualizado
}

export function cambiarDisponibilidadProducto(id, activo) {
  const productos = getProductos()
  const existente = productos.find((producto) => producto.id === id)

  if (!existente) {
    throw new Error('El producto ya no existe en el catálogo.')
  }

  const actualizado = normalizarProducto({
    ...existente,
    activo: Boolean(activo),
  })

  guardarProductos(
    productos.map((producto) => (producto.id === id ? actualizado : producto)),
  )
  return actualizado
}

export function descontarStock(items) {
  const productos = getProductos()
  const cantidades = new Map()

  for (const item of items) {
    const cantidad = Math.max(0, Math.trunc(Number(item.cantidad) || 0))
    if (cantidad === 0) continue
    cantidades.set(
      item.productoId,
      (cantidades.get(item.productoId) ?? 0) + cantidad,
    )
  }

  if (cantidades.size === 0) {
    throw new Error('No hay productos para descontar del inventario.')
  }

  for (const [productoId, cantidad] of cantidades) {
    const producto = productos.find((item) => item.id === productoId)

    if (!producto) {
      throw new Error('Uno de los productos ya no está disponible.')
    }

    if (!esProductoActivo(producto)) {
      throw new Error(`"${producto.titulo}" ya no está a la venta.`)
    }

    if (cantidad > producto.stock) {
      throw new Error(
        `No hay stock suficiente de "${producto.titulo}". Actualiza tu carrito.`,
      )
    }
  }

  const actualizados = productos.map((producto) => {
    const cantidad = cantidades.get(producto.id)
    if (!cantidad) return producto
    return normalizarProducto({
      ...producto,
      stock: producto.stock - cantidad,
    })
  })

  guardarProductos(actualizados)
  return actualizados
}

export function eliminarProducto(id) {
  guardarProductos(getProductos().filter((producto) => producto.id !== id))
}

export function subscribeProductos(listener) {
  function invalidar() {
    cacheProductos = null
    listener()
  }

  function handleStorage(event) {
    if (event.key !== PRODUCTOS_STORAGE_KEY && event.key !== null) return
    invalidar()
  }

  window.addEventListener(PRODUCTOS_EVENT, invalidar)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(PRODUCTOS_EVENT, invalidar)
    window.removeEventListener('storage', handleStorage)
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
