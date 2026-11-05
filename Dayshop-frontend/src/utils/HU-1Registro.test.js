import { describe, expect, it } from 'vitest'
import {
  getEmailError,
  getPasswordError,
  getRegistrationFieldError,
  isRegistrationFormValid,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  REGISTRATION_FIELDS,
  validateRegistration,
} from './HU-1Registro.js'

const VALID_VALUES = {
  nombreCompleto: 'María Pérez',
  email: 'maria@example.com',
  telefono: '999888777',
  password: 'a'.repeat(MIN_PASSWORD_LENGTH),
}

describe('US-x registro: validaciones', () => {
  it('1. solicita nombre completo, correo, teléfono y contraseña', () => {
    expect(REGISTRATION_FIELDS).toEqual([
      'nombreCompleto',
      'email',
      'telefono',
      'password',
    ])

    const errors = validateRegistration({})

    for (const field of REGISTRATION_FIELDS) {
      expect(errors[field]).toBeTruthy()
      expect(getRegistrationFieldError(field, '')).toBeTruthy()
    }
  })

  it('2. valida la sintaxis del correo electrónico', () => {
    expect(isValidEmail('usuario@dominio.com')).toBe(true)
    expect(isValidEmail('usuario@dominio')).toBe(false)
    expect(isValidEmail('usuario@dominio..com')).toBe(false)

    expect(getEmailError('usuario@dominio.com')).toBe('')
    expect(getEmailError('usuario@dominio')).toBe(
      'Ingresa un correo electrónico válido.',
    )
    expect(getRegistrationFieldError('email', 'usuario@dominio')).toBe(
      'Ingresa un correo electrónico válido.',
    )
  })

  it('3. exige una contraseña de al menos 12 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12)
    expect(getPasswordError('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(
      'La contraseña debe tener al menos 12 caracteres.',
    )
    expect(getPasswordError('a'.repeat(MIN_PASSWORD_LENGTH))).toBe('')
    expect(
      getRegistrationFieldError(
        'password',
        'a'.repeat(MIN_PASSWORD_LENGTH - 1),
      ),
    ).toBe('La contraseña debe tener al menos 12 caracteres.')
  })

  it('4. no permite enviar el formulario con campos vacíos o inválidos', () => {
    expect(isRegistrationFormValid({})).toBe(false)
    expect(
      isRegistrationFormValid({
        ...VALID_VALUES,
        email: 'correo-invalido',
      }),
    ).toBe(false)
    expect(
      isRegistrationFormValid({
        ...VALID_VALUES,
        password: 'corta',
      }),
    ).toBe(false)
    expect(
      isRegistrationFormValid({
        ...VALID_VALUES,
        nombreCompleto: '',
      }),
    ).toBe(false)
    expect(isRegistrationFormValid(VALID_VALUES)).toBe(true)
  })
})
