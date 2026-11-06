import { webcrypto } from 'node:crypto'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.jsx'
import Catalogo from '../page/Catalogo/Catalogo.jsx'
import ProductoCard from '../page/Catalogo/ProductoCard.jsx'
import {
  PRODUCTOS_PREDETERMINADOS,
  actualizarProducto,
  crearProducto,
  formatearPrecio,
} from '../data/productos.js'
import { USERS_STORAGE_KEY } from '../data/usuarios.js'
import {
  agruparProductosPorCategoria,
  obtenerEstadoStock,
} from './HU-3Catalogo.js'

const encoder = new TextEncoder()

function toBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function sha256Base64(value) {
  const data = typeof value === 'string' ? encoder.encode(value) : value
  const digest = await webcrypto.subtle.digest('SHA-256', data)
  return toBase64(new Uint8Array(digest))
}

async function derivePasswordKey(password, salt, iterations) {
  const baseKey = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    256,
  )
  return new Uint8Array(bits)
}

async function crearUsuario() {
  const email = 'cliente@dominio.com'
  const password = 'ClaveSegura123'
  const iterations = 1000
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const passwordKey = await derivePasswordKey(password, salt, iterations)
  const authHash = await sha256Base64(passwordKey)
  const aesKey = await webcrypto.subtle.importKey(
    'raw',
    passwordKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
  const iv = webcrypto.getRandomValues(new Uint8Array(12))
  const profile = {
    nombreCompleto: 'Cliente Prueba',
    email,
    telefono: '+57 300 123 4567',
    rol: 'cliente',
  }
  const encryptedProfile = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(JSON.stringify(profile)),
  )

  localStorage.setItem(
    USERS_STORAGE_KEY,
    JSON.stringify([
      {
        id: 'cliente-prueba',
        emailHash: await sha256Base64(email),
        salt: toBase64(salt),
        iterations,
        authHash,
        iv: toBase64(iv),
        profile: toBase64(new Uint8Array(encryptedProfile)),
        createdAt: '2026-11-05T00:00:00.000Z',
      },
    ]),
  )
}

function completarLogin(email, password) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: password },
  })
}

function propsCatalogo() {
  return {
    esAdmin: false,
    onBack: vi.fn(),
    onOpenAdmin: vi.fn(),
    onOpenBuscador: vi.fn(),
    onOpenCarrito: vi.fn(),
    onSelectProduct: vi.fn(),
  }
}

function productoBase(overrides = {}) {
  return {
    id: 'producto-prueba',
    titulo: 'Producto de prueba',
    categoria: 'tecnologia',
    precio: 99.9,
    stock: 3,
    imagen: 'https://example.com/producto.png',
    descripcion: 'Descripción de prueba',
    especificaciones: { Color: 'Negro' },
    ...overrides,
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('Catálogo - criterios de aceptación US-x', () => {
  it('1. organiza y muestra los productos por categoría', () => {
    const agrupadas = agruparProductosPorCategoria([
      { id: 'a', titulo: 'Producto A', categoria: 'hogar' },
      { id: 'b', titulo: 'Producto B', categoria: 'tecnologia' },
      { id: 'c', titulo: 'Producto C', categoria: 'tecnologia' },
    ])

    expect(agrupadas.map((categoria) => categoria.id)).toEqual([
      'tecnologia',
      'hogar',
    ])
    expect(agrupadas[0].productos.map((producto) => producto.id)).toEqual([
      'b',
      'c',
    ])

    render(createElement(Catalogo, propsCatalogo()))

    expect(screen.getByRole('heading', { name: 'Tecnología' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Hogar' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Moda' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Deportes' })).not.toBeNull()
  })

  it('2. muestra imagen, título y precio en soles en cada producto', () => {
    const producto = productoBase({
      id: 'producto-imagen',
      titulo: 'Audífonos de Prueba',
      precio: 249.9,
    })

    render(createElement(ProductoCard, { producto, onSelect: vi.fn() }))

    expect(
      screen.getByRole('img', { name: producto.titulo }).getAttribute('src'),
    ).toBe(producto.imagen)
    expect(
      screen.getByRole('heading', { name: producto.titulo }),
    ).not.toBeNull()
    expect(screen.getByText('S/. 249.90')).not.toBeNull()
    expect(formatearPrecio(producto.precio)).toBe('S/. 249.90')
  })

  it('3. indica el estado del stock disponible o agotado', () => {
    expect(obtenerEstadoStock({ stock: 5 })).toMatchObject({
      disponible: true,
      etiqueta: 'Disponible',
      detalle: '5 en stock',
    })
    expect(obtenerEstadoStock({ stock: 0 })).toMatchObject({
      disponible: false,
      etiqueta: 'Agotado',
      detalle: 'Sin stock',
    })

    render(
      createElement(
        'div',
        null,
        createElement(ProductoCard, {
          producto: productoBase({
            id: 'producto-disponible',
            titulo: 'Producto disponible',
            stock: 5,
          }),
          onSelect: vi.fn(),
        }),
        createElement(ProductoCard, {
          producto: productoBase({
            id: 'producto-agotado',
            titulo: 'Producto agotado',
            stock: 0,
          }),
          onSelect: vi.fn(),
        }),
      ),
    )

    expect(screen.getByText('Disponible')).not.toBeNull()
    expect(screen.getByText('5 en stock')).not.toBeNull()
    expect(screen.getAllByText('Agotado').length).toBeGreaterThan(0)
    expect(screen.getByText('Sin stock')).not.toBeNull()
  })

  it('4. al hacer clic en un producto muestra sus detalles completos', async () => {
    await crearUsuario()

    const producto = PRODUCTOS_PREDETERMINADOS[0]
    render(createElement(App))

    completarLogin('cliente@dominio.com', 'ClaveSegura123')
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(
      await screen.findByRole('heading', { name: 'Mi cuenta / Mis compras' }),
    ).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ver catálogo' }))

    const tituloEnCatalogo = await screen.findByRole('heading', {
      name: producto.titulo,
    })
    fireEvent.click(tituloEnCatalogo.closest('button'))

    expect(
      await screen.findByRole('heading', { level: 1, name: producto.titulo }),
    ).not.toBeNull()
    expect(screen.getByText(producto.descripcion)).not.toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Especificaciones' }),
    ).not.toBeNull()

    const [clave, valor] = Object.entries(producto.especificaciones)[0]
    expect(screen.getByText(clave)).not.toBeNull()
    expect(screen.getByText(valor)).not.toBeNull()
  })

  it('5. actualiza el catálogo al crear o editar productos', async () => {
    render(createElement(Catalogo, propsCatalogo()))

    let creado

    await act(async () => {
      creado = crearProducto({
        titulo: 'Producto Nuevo Test',
        categoria: 'tecnologia',
        precio: 199.9,
        stock: 2,
        descripcion: 'Producto agregado desde el panel',
        especificaciones: { Color: 'Azul' },
      })
    })

    expect(screen.getByText('Producto Nuevo Test')).not.toBeNull()
    expect(screen.getByText('S/. 199.90')).not.toBeNull()

    await act(async () => {
      actualizarProducto(creado.id, {
        titulo: 'Producto Editado Test',
        precio: 149.9,
      })
    })

    expect(screen.queryByText('Producto Nuevo Test')).toBeNull()
    expect(screen.getByText('Producto Editado Test')).not.toBeNull()
    expect(screen.getByText('S/. 149.90')).not.toBeNull()
  })
})
