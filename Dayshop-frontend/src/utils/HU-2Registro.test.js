import { webcrypto } from 'node:crypto'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.jsx'
import Registro from '../page/Registro.jsx'
import {
  MIN_PASSWORD_LENGTH,
  getFieldError,
  isRegistroFormValid,
  validateRegistroForm,
} from './HU-2Registro.js'
import { USERS_STORAGE_KEY } from '../data/usuarios.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
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

async function descifrarPerfil(user, password) {
  const passwordKey = await derivePasswordKey(
    password,
    base64ToBytes(user.salt),
    user.iterations,
  )
  const aesKey = await webcrypto.subtle.importKey(
    'raw',
    passwordKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )
  const decrypted = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(user.iv) },
    aesKey,
    base64ToBytes(user.profile),
  )
  return JSON.parse(decoder.decode(decrypted))
}

async function crearUsuarioRegistrado(email) {
  const emailHash = await sha256Base64(email.trim().toLowerCase())
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([{ emailHash }]))
}

function completarRegistro({
  nombreCompleto = 'Cliente Nuevo',
  email = 'nuevo@dominio.com',
  telefono = '+57 300 123 4567',
  password = 'ClaveSegura123',
} = {}) {
  fireEvent.change(screen.getByLabelText('Nombre completo'), {
    target: { value: nombreCompleto },
  })
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('Teléfono'), {
    target: { value: telefono },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: password },
  })
}

function enviarRegistro() {
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
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

describe('Registro - criterios de aceptación US-x', () => {
  it('1. solicita nombre completo, correo, teléfono y contraseña', () => {
    expect(validateRegistroForm({})).toEqual({
      nombreCompleto: 'El nombre completo es obligatorio.',
      email: 'El correo electrónico es obligatorio.',
      telefono: 'El teléfono es obligatorio.',
      password: 'La contraseña es obligatoria.',
    })
  })

  it('2. valida la sintaxis del correo y que no esté registrado', async () => {
    expect(getFieldError('email', 'usuario@dominio.com')).toBe('')
    expect(getFieldError('email', 'usuario@dominio')).not.toBe('')

    await crearUsuarioRegistrado('registrado@dominio.com')

    const onRegistered = vi.fn()
    render(createElement(Registro, { onRegistered }))

    completarRegistro({ email: 'registrado@dominio.com' })
    enviarRegistro()

    expect(
      await screen.findByText('Este correo ya está registrado.'),
    ).not.toBeNull()
    expect(onRegistered).not.toHaveBeenCalled()
  })

  it('3. exige una contraseña de al menos 12 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12)
    expect(getFieldError('password', '12345678901')).toBe(
      'La contraseña debe tener al menos 12 caracteres.',
    )
    expect(getFieldError('password', '123456789012')).toBe('')
  })

  it('4. no permite enviar el formulario vacío o con formato inválido', () => {
    expect(
      isRegistroFormValid({
        nombreCompleto: 'Ana',
        email: 'correo-invalido',
        telefono: '123',
        password: 'corta',
      }),
    ).toBe(false)

    const onRegistered = vi.fn()
    render(createElement(Registro, { onRegistered }))

    const submit = screen.getByRole('button', { name: 'Crear cuenta' })
    expect(submit.disabled).toBe(true)

    fireEvent.submit(submit.closest('form'))

    expect(screen.getByText('El nombre completo es obligatorio.')).not.toBeNull()
    expect(screen.getByText('El correo electrónico es obligatorio.')).not.toBeNull()
    expect(screen.getByText('El teléfono es obligatorio.')).not.toBeNull()
    expect(screen.getByText('La contraseña es obligatoria.')).not.toBeNull()
    expect(onRegistered).not.toHaveBeenCalled()
  })

  it('5. guarda los datos cifrados e inicia sesión tras registrarse', async () => {
    const password = 'ClaveSegura123'
    render(createElement(App))

    fireEvent.click(screen.getByRole('button', { name: 'Regístrate' }))
    completarRegistro({
      nombreCompleto: 'Cliente Nuevo',
      email: 'nuevo@dominio.com',
      telefono: '+57 300 123 4567',
      password,
    })
    enviarRegistro()

    expect(
      await screen.findByRole('heading', { name: 'Mi cuenta / Mis compras' }),
    ).not.toBeNull()

    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    expect(raw).not.toContain('ClaveSegura123')
    expect(raw).not.toContain('Cliente Nuevo')
    expect(raw).not.toContain('nuevo@dominio.com')

    const users = JSON.parse(raw)
    const emailHash = await sha256Base64('nuevo@dominio.com')
    const creado = users.find((user) => user.emailHash === emailHash)

    expect(creado).toBeTruthy()
    expect(typeof creado.salt).toBe('string')
    expect(typeof creado.authHash).toBe('string')
    expect(typeof creado.iv).toBe('string')
    expect(typeof creado.profile).toBe('string')
    expect(creado.authHash).not.toBe(password)

    await expect(descifrarPerfil(creado, password)).resolves.toEqual({
      nombreCompleto: 'Cliente Nuevo',
      email: 'nuevo@dominio.com',
      telefono: '+57 300 123 4567',
      rol: 'cliente',
    })
  })
})
