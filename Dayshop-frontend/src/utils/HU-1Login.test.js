import { webcrypto } from 'node:crypto'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.jsx'
import {
  MIN_PASSWORD_LENGTH,
  getFieldError,
  isLoginFormValid,
  validateLoginForm,
} from './HU-1Login.js'
import Login from '../page/Login.jsx'
import { USERS_STORAGE_KEY } from '../data/usuarios.js'

const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000
const FAST_WAIT = { interval: 5 }
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

async function crearUsuario({
  email = 'cliente@dominio.com',
  password = 'ClaveSegura123',
  iterations = 1000,
  rol = 'cliente',
} = {}) {
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
    rol,
  }
  const encryptedProfile = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(JSON.stringify(profile)),
  )

  const user = {
    id: 'cliente-prueba',
    emailHash: await sha256Base64(email.trim().toLowerCase()),
    salt: toBase64(salt),
    iterations,
    authHash,
    iv: toBase64(iv),
    profile: toBase64(new Uint8Array(encryptedProfile)),
    createdAt: '2026-11-05T00:00:00.000Z',
  }

  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([user]))
  return user
}

function completarLogin(email, password) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: password },
  })
}

function enviarLogin() {
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
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
  vi.useRealTimers()
  localStorage.clear()
})

describe('Login - criterios de aceptación US-x', () => {
  it('1. exige una contraseña de al menos 12 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12)
    expect(getFieldError('password', '12345678901')).toBe(
      'La contraseña debe tener al menos 12 caracteres.',
    )
    expect(getFieldError('password', '123456789012')).toBe('')
  })

  it('2. valida la sintaxis del correo electrónico', () => {
    expect(getFieldError('email', 'usuario@dominio.com')).toBe('')
    expect(getFieldError('email', 'usuario@dominio')).not.toBe('')
    expect(getFieldError('email', 'usuario dominio.com')).not.toBe('')
  })

  it('3. no permite el acceso con correo o contraseña incorrectos', async () => {
    await crearUsuario()
    const onLoggedIn = vi.fn()

    const firstRender = render(createElement(Login, { onLoggedIn }))
    completarLogin('cliente@dominio.com', 'OtraClave123')
    enviarLogin()
    await screen.findByRole('alert', {}, FAST_WAIT)
    expect(onLoggedIn).not.toHaveBeenCalled()
    firstRender.unmount()

    render(createElement(Login, { onLoggedIn }))
    completarLogin('no-existe@dominio.com', 'ClaveSegura123')
    enviarLogin()
    await screen.findByRole('alert', {}, FAST_WAIT)
    expect(onLoggedIn).not.toHaveBeenCalled()
  })

  it('4. no permite enviar el formulario con los campos vacíos', () => {
    expect(validateLoginForm({ email: '', password: '' })).toEqual({
      email: 'El correo electrónico es obligatorio.',
      password: 'La contraseña es obligatoria.',
    })
    expect(
      isLoginFormValid({ email: 'usuario@dominio.com', password: '123456789012' }),
    ).toBe(true)

    render(createElement(Login))

    const submit = screen.getByRole('button', { name: 'Iniciar sesión' })
    expect(submit.disabled).toBe(true)

    fireEvent.submit(submit.closest('form'))

    expect(screen.getByText('El correo electrónico es obligatorio.')).not.toBeNull()
    expect(screen.getByText('La contraseña es obligatoria.')).not.toBeNull()
  })

  it('5. muestra un mensaje claro cuando falla la autenticación', async () => {
    await crearUsuario()
    render(createElement(Login))

    completarLogin('cliente@dominio.com', 'OtraClave123')
    enviarLogin()

    const alert = await screen.findByRole('alert', {}, FAST_WAIT)
    expect(alert.textContent).toContain('Correo o contraseña incorrectos')
  })

  it('6. no revela si el correo existe o no', async () => {
    await crearUsuario()

    const firstRender = render(createElement(Login))
    completarLogin('cliente@dominio.com', 'OtraClave123')
    enviarLogin()
    const wrongPasswordMessage = (await screen.findByRole('alert', {}, FAST_WAIT))
      .textContent
    firstRender.unmount()

    render(createElement(Login))
    completarLogin('no-existe@dominio.com', 'OtraClave123')
    enviarLogin()
    const unknownEmailMessage = (await screen.findByRole('alert', {}, FAST_WAIT))
      .textContent

    expect(unknownEmailMessage).toBe(wrongPasswordMessage)
    expect(wrongPasswordMessage).toContain('Correo o contraseña incorrectos')
    expect(wrongPasswordMessage).not.toMatch(/no existe|no registrado/i)
  })

  it('7. oculta la contraseña y permite mostrarla u ocultarla', () => {
    render(createElement(Login))

    const passwordInput = screen.getByLabelText('Contraseña')
    expect(passwordInput.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(passwordInput.type).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(passwordInput.type).toBe('password')
  })

  it('8. redirige a "Mi cuenta / Mis compras" tras iniciar sesión', async () => {
    await crearUsuario()
    render(createElement(App))

    completarLogin('cliente@dominio.com', 'ClaveSegura123')
    enviarLogin()

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Mi cuenta / Mis compras' },
        FAST_WAIT,
      ),
    ).not.toBeNull()
  })

  it('9. bloquea la cuenta 15 minutos tras 5 intentos fallidos consecutivos', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    const startedAt = new Date('2026-11-05T12:00:00.000Z')
    vi.setSystemTime(startedAt)

    await crearUsuario()
    const onLoggedIn = vi.fn()
    render(createElement(Login, { onLoggedIn }))

    for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
      completarLogin('cliente@dominio.com', 'OtraClave123')
      enviarLogin()

      const remaining = MAX_ATTEMPTS - attempt

      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain(
          `Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}`,
        )
      }, FAST_WAIT)
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Iniciar sesión' }).disabled,
        ).toBe(false)
      }, FAST_WAIT)
    }

    completarLogin('cliente@dominio.com', 'OtraClave123')
    enviarLogin()

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'bloqueada temporalmente',
      )
    }, FAST_WAIT)
    expect(onLoggedIn).not.toHaveBeenCalled()

    vi.setSystemTime(new Date(startedAt.getTime() + LOCK_DURATION_MS + 1000))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Iniciar sesión' }).disabled,
      ).toBe(false)
    }, FAST_WAIT)

    completarLogin('cliente@dominio.com', 'ClaveSegura123')
    enviarLogin()

    await waitFor(() => {
      expect(onLoggedIn).toHaveBeenCalledTimes(1)
    }, FAST_WAIT)
  })
})
