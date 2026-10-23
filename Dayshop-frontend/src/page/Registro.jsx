import { useRef, useState } from 'react'

const USERS_STORAGE_KEY = 'dayshop:users:v1'
const PBKDF2_ITERATIONS = 210_000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NAME_PATTERN = /^[\p{L}\s.'-]+$/u
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/
const FIELDS = ['nombreCompleto', 'email', 'telefono', 'password']
const encoder = new TextEncoder()

function normalizeEmail(value) {
  return value.trim().toLowerCase()
}

function getFieldError(name, value) {
  const trimmed = value.trim()

  if (name === 'nombreCompleto') {
    if (!trimmed) return 'El nombre completo es obligatorio.'
    if (trimmed.length < 3) return 'Ingresa al menos 3 caracteres.'
    if (!NAME_PATTERN.test(trimmed)) {
      return 'Usa solo letras, espacios, puntos, guiones o apóstrofes.'
    }
    return ''
  }

  if (name === 'email') {
    if (!trimmed) return 'El correo electrónico es obligatorio.'
    if (!EMAIL_PATTERN.test(trimmed)) return 'Ingresa un correo electrónico válido.'
    return ''
  }

  if (name === 'telefono') {
    if (!trimmed) return 'El teléfono es obligatorio.'
    const digits = trimmed.replace(/\D/g, '')
    if (!PHONE_PATTERN.test(trimmed) || digits.length < 7 || digits.length > 15) {
      return 'Ingresa un teléfono válido de 7 a 15 dígitos.'
    }
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

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((user) => user && typeof user.emailHash === 'string')
      : []
  } catch {
    return []
  }
}

async function isEmailAvailable(email) {
  const emailHash = await digestBase64(normalizeEmail(email))
  return !readUsers().some((user) => user.emailHash === emailHash)
}

async function registerUser(values) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Tu navegador no permite cifrar los datos. Usa un navegador actualizado.')
  }

  const normalizedEmail = normalizeEmail(values.email)
  const emailHash = await digestBase64(normalizedEmail)

  if (readUsers().some((user) => user.emailHash === emailHash)) {
    const error = new Error('Este correo ya está registrado.')
    error.code = 'EMAIL_TAKEN'
    throw error
  }

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const passwordKey = await derivePasswordKey(values.password, salt, PBKDF2_ITERATIONS)
  const authHash = await digestBase64(passwordKey)
  const aesKey = await crypto.subtle.importKey(
    'raw',
    passwordKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const profile = {
    nombreCompleto: values.nombreCompleto.trim(),
    email: normalizedEmail,
    telefono: values.telefono.trim(),
  }
  const encryptedProfile = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(JSON.stringify(profile)),
  )

  const user = {
    id: crypto.randomUUID?.() ?? `user-${Date.now()}`,
    emailHash,
    salt: bytesToBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    authHash,
    iv: bytesToBase64(iv),
    profile: bytesToBase64(new Uint8Array(encryptedProfile)),
    createdAt: new Date().toISOString(),
  }

  const users = readUsers()
  users.push(user)

  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  } catch {
    throw new Error('No se pudo guardar la cuenta en este navegador.')
  }

  return { id: user.id, ...profile }
}

function FormField({
  id,
  label,
  type = 'text',
  value,
  error,
  hint,
  autoComplete,
  placeholder,
  inputMode,
  onChange,
  onBlur,
  rightSlot,
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          autoComplete={autoComplete}
          placeholder={placeholder}
          inputMode={inputMode}
          className={[
            'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4',
            rightSlot ? 'pr-24' : '',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
              : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100',
          ].join(' ')}
        />
        {rightSlot}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function Registro({ onRegistered }) {
  const [form, setForm] = useState({
    nombreCompleto: '',
    email: '',
    telefono: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [emailTaken, setEmailTaken] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const latestEmail = useRef('')

  const isFormValid =
    FIELDS.every((name) => !getFieldError(name, form[name])) && !emailTaken

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({ ...current, [name]: value }))
    setFormError('')

    if (name === 'email') {
      latestEmail.current = value
      setEmailTaken(false)
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
      const available = await isEmailAvailable(value)
      if (normalizeEmail(latestEmail.current) !== normalizeEmail(value)) return

      setEmailTaken(!available)
      setErrors((current) => ({
        ...current,
        email: available ? '' : 'Este correo ya está registrado.',
      }))
    } catch {
      setFormError('No se pudo verificar el correo. Intenta nuevamente.')
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
      const available = await isEmailAvailable(form.email)
      if (!available) {
        setEmailTaken(true)
        setErrors((current) => ({
          ...current,
          email: 'Este correo ya está registrado.',
        }))
        return
      }

      const user = await registerUser(form)
      onRegistered?.(user)
    } catch (error) {
      if (error.code === 'EMAIL_TAKEN') {
        setEmailTaken(true)
        setErrors((current) => ({
          ...current,
          email: 'Este correo ya está registrado.',
        }))
      } else {
        setFormError(error.message || 'No se pudo crear la cuenta. Intenta nuevamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

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
                Crea tu cuenta
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Regístrate para comprar de forma segura. Tus datos personales se almacenan cifrados.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <FormField
            id="nombreCompleto"
            label="Nombre completo"
            value={form.nombreCompleto}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.nombreCompleto}
            autoComplete="name"
            placeholder="María Pérez"
          />
          <FormField
            id="email"
            label="Correo electrónico"
            type="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            autoComplete="email"
            placeholder="maria@ejemplo.com"
          />
          <FormField
            id="telefono"
            label="Teléfono"
            type="tel"
            value={form.telefono}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.telefono}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+57 300 123 4567"
          />
          <FormField
            id="password"
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.password}
            hint={
              form.password.length > 0
                ? `${form.password.length} de 12 caracteres mínimo`
                : 'Mínimo 12 caracteres.'
            }
            autoComplete="new-password"
            placeholder="Mínimo 12 caracteres"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-bold uppercase tracking-wide text-indigo-600 transition hover:text-indigo-800"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            }
          />

          {formError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {formError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Tus datos personales se cifran con AES-GCM antes de guardarse en este navegador.
        </p>
      </section>
    </main>
  )
}

export default Registro
