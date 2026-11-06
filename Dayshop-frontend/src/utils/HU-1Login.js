export const MIN_PASSWORD_LENGTH = 12
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const LOGIN_FIELDS = ['email', 'password']

function asText(value) {
  return typeof value === 'string' ? value : ''
}

export function getFieldError(name, value) {
  if (name === 'email') {
    const trimmed = asText(value).trim()
    if (!trimmed) return 'El correo electrónico es obligatorio.'
    if (!EMAIL_PATTERN.test(trimmed)) return 'Ingresa un correo electrónico válido.'
    return ''
  }

  if (name === 'password') {
    const password = asText(value)
    if (!password) return 'La contraseña es obligatoria.'
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }
    return ''
  }

  return ''
}

export function validateLoginForm(values = {}) {
  const errors = {}

  for (const name of LOGIN_FIELDS) {
    const error = getFieldError(name, values[name])
    if (error) errors[name] = error
  }

  return errors
}

export function isLoginFormValid(values = {}) {
  return Object.keys(validateLoginForm(values)).length === 0
}
