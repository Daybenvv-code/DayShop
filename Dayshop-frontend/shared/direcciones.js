import { obtenerCiudad } from './envios.js'
import {
  MENSAJE_SIN_COBERTURA,
  MENSAJE_TELEFONO_INVALIDO,
} from './mensajes.js'

export const CAMPOS_DIRECCION = ['direccion', 'referencia', 'ciudad', 'celular']
export const CELULAR_PATTERN = /^\d{9}$/

export function getDireccionFieldError(name, value) {
  const texto = String(value ?? '').trim()

  if (name === 'direccion') {
    if (!texto) return 'La dirección exacta es obligatoria.'
    if (texto.length < 6) return 'Incluye calle, número y distrito.'
    return ''
  }

  if (name === 'referencia') {
    if (!texto) return 'La referencia es obligatoria.'
    return ''
  }

  if (name === 'ciudad') {
    if (!texto) return 'Selecciona tu ciudad.'
    const ciudad = obtenerCiudad(texto)
    if (!ciudad) return 'Selecciona una ciudad válida.'
    if (!ciudad.cobertura) return MENSAJE_SIN_COBERTURA
    return ''
  }

  if (name === 'celular') {
    if (!texto) return 'El celular de contacto es obligatorio.'
    if (!CELULAR_PATTERN.test(texto)) return MENSAJE_TELEFONO_INVALIDO
    return ''
  }

  return ''
}

export function validateDireccion(values) {
  const errors = {}

  for (const field of CAMPOS_DIRECCION) {
    const error = getDireccionFieldError(field, values?.[field])
    if (error) errors[field] = error
  }

  return errors
}

export function normalizarDireccion(values) {
  return {
    alias: String(values?.alias ?? '').trim(),
    direccion: String(values?.direccion ?? '').trim(),
    referencia: String(values?.referencia ?? '').trim(),
    ciudad: String(values?.ciudad ?? '').trim(),
    celular: String(values?.celular ?? '').trim(),
  }
}
