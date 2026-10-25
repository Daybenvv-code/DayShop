import { useEffect, useRef, useState } from 'react'
import {
  USERS_STORAGE_KEY,
  normalizarRol,
} from '../data/usuarios.js'

const ATTEMPTS_STORAGE_KEY = 'dayshop:login-attempts:v1'
const PBKDF2_ITERATIONS = 210_000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000
const GENERIC_ERROR = 'Correo o contraseña incorrectos.'
const FIELDS = ['email', 'password']
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function getFieldError(name, value) {
  if (name === 'email') {
    const trimmed = value.trim()
    if (!trimmed) return 'El correo electrónico es obligatorio.'
    if (!EMAIL_PATTERN.test(trimmed)) return 'Ingresa un correo electrónico válido.'
    return ''
  }

  if (name === 'password') {
    if (!value) return 'La contraseña es obligatoria.'
    if (value.length < 12) return 'La contraseña debe tener al menos 12 caracteres.'
    return ''
  }

  return ''
}

function bytesToBase64(bytes) {
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

async function digestBase64(value) {
  const data = typeof value === 'string' ? encoder.encode(value) : value
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToBase64(new Uint8Array(digest))
}

async function derivePasswordKey(password, salt, iterations) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    256,
  )
  return new Uint8Array(bits)
}

function safeEqual(left, right) {
  if (typeof right !== 'string' || left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(
          (user) =>
            user &&
            typeof user.emailHash === 'string' &&
            typeof user.salt === 'string' &&
            typeof user.authHash === 'string' &&
            typeof user.iv === 'string' &&
            typeof user.profile === 'string',
        )
      : []
  } catch {
    return []
  }
}

function readAttempts() {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeAttempts(attempts) {
  try {
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts))
  } catch {
    /* Si el almacenamiento no está disponible, el bloqueo no persiste. */
  }
}

async function getAttemptsKey(email) {
  return digestBase64(`login:${normalizeEmail(email)}`)
}

async function getLockUntil(email) {
  const attempts = readAttempts()
  const record = attempts[await getAttemptsKey(email)]
  if (!record || typeof record.lockedUntil !== 'number') return 0
  return record.lockedUntil > Date.now() ? record.lockedUntil : 0
}

async function registerFailedAttempt(email) {
  const key = await getAttemptsKey(email)
  const attempts = readAttempts()
  const record = attempts[key]
  const now = Date.now()

  if (record && typeof record.lockedUntil === 'number' && record.lockedUntil > now) {
    return { count: MAX_ATTEMPTS, lockedUntil: record.lockedUntil }
  }

  const previousCount =
    record && typeof record.count === 'number' && !(record.lockedUntil <= now)
      ? record.count
      : 0
  const count = previousCount + 1
  const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCK_DURATION_MS : 0

  attempts[key] = { count, lockedUntil }
  writeAttempts(attempts)

  return { count, lockedUntil }
}

async function clearFailedAttempts(email) {
  const key = await getAttemptsKey(email)
  const attempts = readAttempts()
  if (!(key in attempts)) return
  delete attempts[key]
  writeAttempts(attempts)
}

async function authenticate(values) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Tu navegador no permite verificar los datos. Usa un navegador actualizado.')
  }

  const emailHash = await digestBase64(normalizeEmail(values.email))
  const user = readUsers().find((candidate) => candidate.emailHash === emailHash)

  const salt = user ? base64ToBytes(user.salt) : new Uint8Array(16)
  const iterations = Number.isFinite(user?.iterations) ? user.iterations : PBKDF2_ITERATIONS
  const passwordKey = await derivePasswordKey(values.password, salt, iterations)
  const authHash = await digestBase64(passwordKey)

  if (!user || !safeEqual(authHash, user.authHash)) return null

  try {
    const aesKey = await crypto.subtle.importKey(
      'raw',
      passwordKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    )
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(user.iv) },
      aesKey,
      base64ToBytes(user.profile),
    )
    const profile = JSON.parse(decoder.decode(decrypted))
    return { id: user.id, ...profile, rol: normalizarRol(profile.rol) }
  } catch {
    return null
  }
}

function formatRemaining(milliseconds) {
  const totalSeconds = Math.max(1, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes <= 0) return `${seconds} s`
  return `${minutes} min ${String(seconds).padStart(2, '0')} s`
}

function Login({ onLoggedIn, onGoToRegister }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lockUntil, setLockUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const latestEmail = useRef('')

  const isLocked = lockUntil > now

  useEffect(() => {
    if (!lockUntil) return undefined

    const intervalId = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= lockUntil) setLockUntil(0)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [lockUntil])

  const isFormValid =
    FIELDS.every((name) => !getFieldError(name, form[name])) && !isLocked

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({ ...current, [name]: value }))
    setFormError('')

    if (name === 'email') {
      latestEmail.current = value
      setLockUntil(0)
    }

    setErrors((current) => {
      if (!current[name]) return current
      return { ...current, [name]: getFieldError(name, value) }
    })
  }

  async function handleBlur(event) {
    const { name, value } = event.target
    const localError = getFieldError(name, value)

    setErrors((current) => ({ ...current, [name]: localError }))

    if (name !== 'email' || localError) return

    try {
      const until = await getLockUntil(value)
      if (normalizeEmail(latestEmail.current) !== normalizeEmail(value)) return

      if (until) {
        setNow(Date.now())
        setLockUntil(until)
      }
    } catch {
      setFormError('No se pudo verificar el estado de la cuenta. Intenta nuevamente.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const nextErrors = {}
    for (const name of FIELDS) {
      const error = getFieldError(name, form[name])
      if (error) nextErrors[name] = error
    }
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)

    try {
      const existingLock = await getLockUntil(form.email)
      if (existingLock) {
        setNow(Date.now())
        setLockUntil(existingLock)
        return
      }

      const user = await authenticate(form)
      if (user) {
        await clearFailedAttempts(form.email)
        onLoggedIn?.(user)
        return
      }

      const { count, lockedUntil } = await registerFailedAttempt(form.email)
      if (lockedUntil) {
        setNow(Date.now())
        setLockUntil(lockedUntil)
      } else {
        const remaining = MAX_ATTEMPTS - count
        setFormError(
          `${GENERIC_ERROR} Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}.`,
        )
      }
    } catch (error) {
      setFormError(error.message || 'No se pudo iniciar sesión. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const alertMessage = isLocked
    ? `Demasiados intentos fallidos. Por seguridad, tu cuenta está bloqueada temporalmente. Intenta de nuevo en ${formatRemaining(
        lockUntil - now,
      )}.`
    : formError

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl"
      />

      <section className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-slate-950/40 sm:p-10">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-black text-white shadow-lg shadow-indigo-600/30">
              D
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                DayShop
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Inicia sesión
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Accede a tu cuenta para revisar y gestionar tus compras de forma segura.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              autoComplete="email"
              placeholder="maria@ejemplo.com"
              className={[
                'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4',
                errors.email
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100',
              ].join(' ')}
            />
            {errors.email ? (
              <p id="email-error" role="alert" className="mt-1.5 text-sm text-red-600">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                className={[
                  'w-full rounded-xl border bg-white px-4 py-3 pr-24 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4',
                  errors.password
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100',
                ].join(' ')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-bold uppercase tracking-wide text-indigo-600 transition hover:text-indigo-800"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.password ? (
              <p id="password-error" role="alert" className="mt-1.5 text-sm text-red-600">
                {errors.password}
              </p>
            ) : null}
          </div>

          {alertMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {alertMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSubmitting ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={onGoToRegister}
            className="font-bold text-indigo-600 transition hover:text-indigo-800"
          >
            Regístrate
          </button>
        </p>
      </section>
    </main>
  )
}

export default Login
