export const COSTO_ENVIO_ESTANDAR = 12.9

export const CIUDADES_ENVIO = [
  {
    id: 'lima',
    nombre: 'Lima',
    departamento: 'Lima',
    cobertura: true,
    tiempo: '24 a 48 horas',
    costoEnvio: 9.9,
  },
  {
    id: 'callao',
    nombre: 'Callao',
    departamento: 'Callao',
    cobertura: true,
    tiempo: '24 a 48 horas',
    costoEnvio: 11.9,
  },
  {
    id: 'arequipa',
    nombre: 'Arequipa',
    departamento: 'Arequipa',
    cobertura: true,
    tiempo: '2 a 4 días',
    costoEnvio: 16.9,
  },
  {
    id: 'trujillo',
    nombre: 'Trujillo',
    departamento: 'La Libertad',
    cobertura: true,
    tiempo: '2 a 4 días',
    costoEnvio: 16.9,
  },
  {
    id: 'cusco',
    nombre: 'Cusco',
    departamento: 'Cusco',
    cobertura: true,
    tiempo: '3 a 5 días',
    costoEnvio: 19.9,
  },
  {
    id: 'piura',
    nombre: 'Piura',
    departamento: 'Piura',
    cobertura: true,
    tiempo: '3 a 5 días',
    costoEnvio: 19.9,
  },
  {
    id: 'tacna',
    nombre: 'Tacna',
    departamento: 'Tacna',
    cobertura: false,
    tiempo: null,
    costoEnvio: 0,
  },
  {
    id: 'iquitos',
    nombre: 'Iquitos',
    departamento: 'Loreto',
    cobertura: false,
    tiempo: null,
    costoEnvio: 0,
  },
  {
    id: 'puno',
    nombre: 'Puno',
    departamento: 'Puno',
    cobertura: false,
    tiempo: null,
    costoEnvio: 0,
  },
]

export function obtenerCiudad(id) {
  return CIUDADES_ENVIO.find((ciudad) => ciudad.id === id) ?? null
}

export function obtenerCostoEnvio(id) {
  return obtenerCiudad(id)?.costoEnvio ?? COSTO_ENVIO_ESTANDAR
}
