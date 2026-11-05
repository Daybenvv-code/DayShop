import { useRef, useState } from 'react'
import {
  ApiError,
  checkEmailAvailability,
  registerUser,
} from '../data/authApi.js'
import {
  getRegistrationFieldError,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  REGISTRATION_FIELDS,
} from '../../shared/validation.js'

const FIELDS = REGISTRATION_FIELDS

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

function Registro({ onRegistered, onGoToLogin }) {
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
    FIELDS.every((name) => !getRegistrationFieldError(name, form[name])) &&
    !emailTaken

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
      return {
        ...current,
        [name]: getRegistrationFieldError(name, value),
      }
    })
  }

  async function handleBlur(event) {
    const { name, value } = event.target
    const localError = getRegistrationFieldError(name, value)

    setErrors((current) => ({ ...current, [name]: localError }))

    if (name !== 'email' || localError) return

    try {
      const result = await checkEmailAvailability(value)
      if (normalizeEmail(latestEmail.current) !== normalizeEmail(value)) return

      const available = result?.available !== false
      setEmailTaken(!available)
      setErrors((current) => ({
        ...current,
        email: available ? '' : 'Este correo ya está registrado.',
      }))
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) return
      setFormError('No se pudo verificar el correo. Intenta nuevamente.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const nextErrors = {}
    for (const name of FIELDS) {
      const error = getRegistrationFieldError(name, form[name])
      if (error) nextErrors[name] = error
    }
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)

    try {
      const data = await registerUser(form)
      onRegistered?.(data.user)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setEmailTaken(true)
          setErrors((current) => ({
            ...current,
            email:
              error.errors.email ?? 'Este correo ya está registrado.',
          }))
        } else if (
          error.status === 400 &&
          Object.keys(error.errors).length > 0
        ) {
          setErrors((current) => ({ ...current, ...error.errors }))
          setFormError(error.message)
        } else {
          setFormError(error.message)
        }
      } else {
        setFormError(
          error.message || 'No se pudo crear la cuenta. Intenta nuevamente.',
        )
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
            Regístrate para comprar de forma segura. Tu cuenta se guarda en el
            servidor de DayShop y estará disponible en cualquier dispositivo.
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
                ? `${form.password.length} de ${MIN_PASSWORD_LENGTH} caracteres mínimo`
                : `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`
            }
            autoComplete="new-password"
            placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
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
          Tu contraseña se almacena cifrada y tus datos se guardan de forma
          segura en el servidor.
        </p>

        {onGoToLogin ? (
          <p className="mt-4 text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              onClick={onGoToLogin}
              className="font-bold text-indigo-600 transition hover:text-indigo-800"
            >
              Inicia sesión
            </button>
          </p>
        ) : null}
      </section>
    </main>
  )
}

export default Registro
