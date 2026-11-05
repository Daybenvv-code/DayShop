import { describe, expect, it } from 'vitest'
import {
  getLoginErrorMessage,
  getPasswordVisibility,
  getPostLoginDestination,
} from './HU-2login.js'

describe('US-x autenticación: interfaz de inicio de sesión', () => {
  it('5. muestra un mensaje claro cuando falla la autenticación', () => {
    expect(
      getLoginErrorMessage({
        status: 401,
        message: 'Credenciales inválidas',
      }),
    ).toBe('Correo o contraseña incorrectos.')

    expect(
      getLoginErrorMessage({
        status: 429,
        message:
          'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
      }),
    ).toBe(
      'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
    )

    expect(getLoginErrorMessage(null)).toBe('')
    expect(getLoginErrorMessage(new Error(''))).toBe(
      'No se pudo iniciar sesión. Intenta nuevamente.',
    )
  })

  it('7. oculta la contraseña y permite mostrarla u ocultarla', () => {
    expect(getPasswordVisibility(false)).toEqual({
      type: 'password',
      toggleLabel: 'Mostrar contraseña',
    })
    expect(getPasswordVisibility(true)).toEqual({
      type: 'text',
      toggleLabel: 'Ocultar contraseña',
    })
  })

  it('8. redirige a "Mi cuenta / Mis compras" tras iniciar sesión', () => {
    expect(getPostLoginDestination()).toEqual({
      screen: 'cuenta',
      title: 'Mi cuenta / Mis compras',
    })
  })
})
