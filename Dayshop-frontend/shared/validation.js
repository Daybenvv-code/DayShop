import { MENSAJE_TELEFONO_INVALIDO } from './mensajes.js'

export const MIN_PASSWORD_LENGTH = 12
export const REGISTRATION_FIELDS = [
  'nombreCompleto',
  'email',
  'telefono',
  'password',
]

const LOCAL_PART_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/
const DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/
const TLD_PATTERN = /^[A-Za-z]{2,63}$/
const NAME_ALLOWED_PATTERN = /^[\p{L}\s.'-]+$/u
const NAME_LETTER_PATTERN = /\p{L}/gu
const PHONE_ALLOWED_PATTERN = /^\+?[\d\s().-]+$/

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function isValidEmail(value) {
  const email = String(value ?? '').trim()

  if (!email || email.length > 254) return false

  const atIndex = email.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === email.length - 1) return false

  const localPart = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)

  if (localPart.length > 64 || !LOCAL_PART_PATTERN.test(localPart)) return false
  if (domain.length > 253) return false

  const labels = domain.split('.')
  if (labels.length < 2) return false
  if (!labels.every((label) => DOMAIN_LABEL_PATTERN.test(label))) return false

  return TLD_PATTERN.test(labels[labels.length - 1])
}

export function getNameError(value) {
  const name = String(value ?? '').trim()

  if (!name) return 'El nombre completo es obligatorio.'
  if (name.length < 3) return 'Ingresa al menos 3 caracteres.'
  if (name.length > 80) return 'El nombre no puede superar los 80 caracteres.'
  if (!NAME_ALLOWED_PATTERN.test(name)) {
    return 'Usa solo letras, espacios, puntos, guiones o apóstrofes.'
  }

  const letters = name.match(NAME_LETTER_PATTERN)
  if (!letters || letters.length < 2) {
    return 'El nombre debe incluir al menos dos letras.'
  }

  return ''
}

export function getEmailError(value) {
  const email = String(value ?? '').trim()

  if (!email) return 'El correo electrónico es obligatorio.'
  if (!isValidEmail(email)) return 'Ingresa un correo electrónico válido.'

  return ''
}

export function getPhoneError(value) {
  const phone = String(value ?? '').trim()

  if (!phone) return 'El teléfono es obligatorio.'

  const digits = phone.replace(/\D/g, '')
  if (!PHONE_ALLOWED_PATTERN.test(phone) || digits.length < 7 || digits.length > 15) {
    return MENSAJE_TELEFONO_INVALIDO
  }

  return ''
}

export function getPasswordError(value) {
  const password = String(value ?? '')

  if (!password) return 'La contraseña es obligatoria.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (password.length > 128) {
    return 'La contraseña no puede superar los 128 caracteres.'
  }

  return ''
}

export function getRegistrationFieldError(name, value) {
  if (name === 'nombreCompleto') return getNameError(value)
  if (name === 'email') return getEmailError(value)
  if (name === 'telefono') return getPhoneError(value)
  if (name === 'password') return getPasswordError(value)
  return ''
}

export function getLoginFieldError(name, value) {
  if (name === 'email') return getEmailError(value)

  if (name === 'password') {
    if (!String(value ?? '')) return 'La contraseña es obligatoria.'
    return ''
  }

  return ''
}

export function validateRegistration(values) {
  const errors = {}

  for (const field of REGISTRATION_FIELDS) {
    const error = getRegistrationFieldError(field, values?.[field])
    if (error) errors[field] = error
  }

  return errors
}
