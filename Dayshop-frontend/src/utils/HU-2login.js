export const AUTH_ERROR_MESSAGE = 'Correo o contraseña incorrectos.'
export const POST_LOGIN_SCREEN = 'cuenta'
export const POST_LOGIN_TITLE = 'Mi cuenta / Mis compras'

export function getLoginErrorMessage(error) {
  if (!error) return ''
  if (error.status === 401) return AUTH_ERROR_MESSAGE
  if (error.status === 429) {
    return (
      error.message ||
      'Demasiados intentos fallidos. Intenta nuevamente más tarde.'
    )
  }

  return error.message || 'No se pudo iniciar sesión. Intenta nuevamente.'
}

export function getPasswordVisibility(showPassword) {
  return {
    type: showPassword ? 'text' : 'password',
    toggleLabel: showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña',
  }
}

export function getPostLoginDestination() {
  return {
    screen: POST_LOGIN_SCREEN,
    title: POST_LOGIN_TITLE,
  }
}
