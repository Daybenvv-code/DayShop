export const MIN_PASSWORD_LENGTH = 12
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const NAME_PATTERN = /^[\p{L}\s.'-]+$/u
export const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/
export const REGISTRO_FIELDS = ['nombreCompleto', 'email', 'telefono', 'password']

function asText(value) {
  return typeof value === 'string' ? value : ''
}

export function getFieldError(name, value) {
  const trimmed = asText(value).trim()

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
    const password = asText(value)
    if (!password) return 'La contraseña es obligatoria.'
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }
    return ''
  }

  return ''
}

export function validateRegistroForm(values = {}) {
  const errors = {}

  for (const name of REGISTRO_FIELDS) {
    const error = getFieldError(name, values[name])
    if (error) errors[name] = error
  }

  return errors
}

export function isRegistroFormValid(values = {}) {
  return Object.keys(validateRegistroForm(values)).length === 0
}
