import { useState } from 'react'
import { ApiError, loginUser } from '../data/authApi.js'
import { getLoginFieldError } from '../../shared/validation.js'

const FIELDS = ['email', 'password']

function Login({ onLoggedIn, onGoToRegister }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFormValid = FIELDS.every(
    (name) => !getLoginFieldError(name, form[name]),
  )

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({ ...current, [name]: value }))
    setFormError('')

    setErrors((current) => {
      if (!current[name]) return current
      return { ...current, [name]: getLoginFieldError(name, value) }
    })
  }

  function handleBlur(event) {
    const { name, value } = event.target

    setErrors((current) => ({
      ...current,
      [name]: getLoginFieldError(name, value),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const nextErrors = {}
    for (const name of FIELDS) {
      const error = getLoginFieldError(name, form[name])
      if (error) nextErrors[name] = error
    }
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)

    try {
      const data = await loginUser(form)
      onLoggedIn?.(data.user)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400 && Object.keys(error.errors).length > 0) {
          setErrors((current) => ({ ...current, ...error.errors }))
          setFormError(error.message)
        } else {
          setFormError(error.message)
        }
      } else {
        setFormError(
          error.message || 'No se pudo iniciar sesión. Intenta nuevamente.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const alertMessage = formError

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
            Accede a tu cuenta para revisar y gestionar tus compras.
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
