import { useState } from 'react'
import {
  eliminarDireccion,
  guardarDireccion,
  useDirecciones,
} from '../../data/direcciones.js'
import { CIUDADES_ENVIO, obtenerCiudad } from '../../data/envios.js'

const FORM_INICIAL = {
  alias: '',
  direccion: '',
  referencia: '',
  ciudad: '',
  celular: '',
}

const CAMPOS_OBLIGATORIOS = ['direccion', 'referencia', 'ciudad', 'celular']

function validarCampo(name, value) {
  const texto = value.trim()

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
    if (!ciudad.cobertura) {
      return `Aún no tenemos cobertura de envío en ${ciudad.nombre}.`
    }
    return ''
  }

  if (name === 'celular') {
    if (!texto) return 'El celular de contacto es obligatorio.'
    if (!/^\d{9}$/.test(texto)) {
      return 'Ingresa un celular de 9 dígitos numéricos.'
    }
    return ''
  }

  return ''
}

function clasesCampo(tieneError) {
  return [
    'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4',
    tieneError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100',
  ].join(' ')
}

function ErrorCampo({ id, mensaje }) {
  if (!mensaje) return null

  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-red-600">
      {mensaje}
    </p>
  )
}

function RegistroEnvio({
  session,
  onBack,
  onOpenCarrito,
  onContinueToPayment,
}) {
  const userId = session?.id ?? session?.email ?? 'invitado'
  const direccionesGuardadas = useDirecciones(userId)
  const [form, setForm] = useState(FORM_INICIAL)
  const [errores, setErrores] = useState({})
  const [direccionSeleccionadaId, setDireccionSeleccionadaId] = useState(null)
  const [guardarEnPerfil, setGuardarEnPerfil] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [direccionConfirmada, setDireccionConfirmada] = useState(null)

  const ciudadSeleccionada = obtenerCiudad(form.ciudad)
  const coberturaDisponible = Boolean(ciudadSeleccionada?.cobertura)

  function handleChange(event) {
    const { name, value } = event.target
    const limpio =
      name === 'celular' ? value.replace(/\D/g, '').slice(0, 9) : value

    setForm((current) => ({ ...current, [name]: limpio }))
    setMensaje(null)
    setDireccionConfirmada(null)

    if (direccionSeleccionadaId) {
      setDireccionSeleccionadaId(null)
      setGuardarEnPerfil(true)
    }

    if (errores[name]) {
      setErrores((current) => ({
        ...current,
        [name]: validarCampo(name, limpio),
      }))
    }
  }

  function seleccionarDireccion(direccion) {
    setDireccionSeleccionadaId(direccion.id)
    setForm({
      alias: direccion.alias ?? '',
      direccion: direccion.direccion,
      referencia: direccion.referencia,
      ciudad: direccion.ciudad,
      celular: direccion.celular,
    })
    setErrores({})
    setMensaje(null)
    setDireccionConfirmada(null)
    setGuardarEnPerfil(false)
  }

  function iniciarNuevaDireccion() {
    setDireccionSeleccionadaId(null)
    setForm(FORM_INICIAL)
    setErrores({})
    setMensaje(null)
    setDireccionConfirmada(null)
    setGuardarEnPerfil(true)
  }

  function handleEliminar(direccion) {
    const confirmado = window.confirm(
      `¿Eliminar la dirección "${direccion.alias || direccion.direccion}"?`,
    )
    if (!confirmado) return

    try {
      eliminarDireccion(userId, direccion.id)
      if (direccionSeleccionadaId === direccion.id) iniciarNuevaDireccion()
      setMensaje({ tipo: 'success', texto: 'Dirección eliminada de tu perfil.' })
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo eliminar la dirección.',
      })
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    setMensaje(null)
    setDireccionConfirmada(null)

    const siguientesErrores = {}
    for (const name of CAMPOS_OBLIGATORIOS) {
      const error = validarCampo(name, form[name])
      if (error) siguientesErrores[name] = error
    }

    setErrores(siguientesErrores)

    if (Object.keys(siguientesErrores).length > 0) {
      setMensaje({
        tipo: 'error',
        texto: 'Revisa los campos marcados para continuar.',
      })
      return
    }

    const ciudad = obtenerCiudad(form.ciudad)
    if (!ciudad?.cobertura) {
      setErrores({
        ciudad: `Aún no tenemos cobertura de envío en ${
          ciudad?.nombre ?? 'esta zona'
        }.`,
      })
      setMensaje({
        tipo: 'error',
        texto: 'La ciudad seleccionada no tiene cobertura de envío disponible.',
      })
      return
    }

    const datos = {
      alias: form.alias.trim(),
      direccion: form.direccion.trim(),
      referencia: form.referencia.trim(),
      ciudad: form.ciudad,
      celular: form.celular,
    }

    try {
      let direccionFinal = null
      let seGuardo = false

      if (guardarEnPerfil) {
        const duplicada = direccionesGuardadas.find(
          (direccion) =>
            direccion.direccion.toLowerCase() ===
              datos.direccion.toLowerCase() &&
            direccion.referencia.toLowerCase() ===
              datos.referencia.toLowerCase() &&
            direccion.ciudad === datos.ciudad &&
            direccion.celular === datos.celular,
        )

        direccionFinal = duplicada ?? guardarDireccion(userId, datos)
        seGuardo = !duplicada
      } else if (direccionSeleccionadaId) {
        direccionFinal =
          direccionesGuardadas.find(
            (direccion) => direccion.id === direccionSeleccionadaId,
          ) ?? null
      }

      if (!direccionFinal) {
        direccionFinal = {
          ...datos,
          id: direccionSeleccionadaId ?? 'actual',
        }
      }

      setDireccionSeleccionadaId(direccionFinal.id)
      setDireccionConfirmada(direccionFinal)
      setMensaje({
        tipo: 'success',
        texto: seGuardo
          ? 'Dirección guardada y seleccionada para tu pedido.'
          : 'Dirección seleccionada para tu pedido.',
      })
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo guardar la dirección.',
      })
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-base font-black shadow-lg shadow-indigo-600/30">
              D
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
                DayShop
              </p>
              <p className="text-lg font-bold leading-tight">Registro de envío</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenCarrito}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Carrito
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Volver
            </button>
          </nav>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
            Datos de entrega
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Ingresa tu dirección exacta y un número de contacto para que el
            repartidor pueda entregar tu paquete en el lugar correcto.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Mis direcciones guardadas
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Selecciona una dirección frecuente o registra una nueva.
                  </p>
                </div>

                {direccionSeleccionadaId ? (
                  <button
                    type="button"
                    onClick={iniciarNuevaDireccion}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  >
                    Nueva dirección
                  </button>
                ) : null}
              </div>

              {direccionesGuardadas.length === 0 ? (
                <p className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  Aún no tienes direcciones guardadas. Completa el formulario y
                  guarda tu primera dirección de envío.
                </p>
              ) : (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {direccionesGuardadas.map((direccion) => {
                    const ciudad = obtenerCiudad(direccion.ciudad)
                    const activa = direccionSeleccionadaId === direccion.id

                    return (
                      <li
                        key={direccion.id}
                        className={[
                          'relative rounded-2xl border p-4 transition',
                          activa
                            ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100'
                            : 'border-slate-200 bg-white hover:border-indigo-200',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          onClick={() => seleccionarDireccion(direccion)}
                          className="w-full pr-14 text-left focus:outline-none"
                        >
                          <span className="block text-sm font-black text-slate-900">
                            {direccion.alias || 'Dirección guardada'}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-600">
                            {direccion.direccion}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            Ref. {direccion.referencia}
                          </span>
                          <span className="mt-1 block text-xs font-semibold text-slate-500">
                            {ciudad
                              ? `${ciudad.nombre} (${ciudad.departamento})`
                              : direccion.ciudad}{' '}
                            · {direccion.celular}
                          </span>
                          {ciudad && !ciudad.cobertura ? (
                            <span className="mt-2 inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                              Sin cobertura
                            </span>
                          ) : null}
                          {activa ? (
                            <span className="mt-2 inline-flex rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                              Seleccionada
                            </span>
                          ) : null}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEliminar(direccion)}
                          aria-label={`Eliminar dirección ${
                            direccion.alias || direccion.direccion
                          }`}
                          className="absolute right-3 top-3 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
                        >
                          Eliminar
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  {direccionSeleccionadaId
                    ? 'Editar dirección seleccionada'
                    : 'Nueva dirección de envío'}
                </h2>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Campos obligatorios *
                </span>
              </div>

              {mensaje ? (
                <div
                  role="alert"
                  className={[
                    'mt-5 rounded-xl border px-4 py-3 text-sm',
                    mensaje.tipo === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700',
                  ].join(' ')}
                >
                  {mensaje.texto}
                </div>
              ) : null}

              <div className="mt-5 space-y-5">
                <div>
                  <label
                    htmlFor="alias"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Alias{' '}
                    <span className="font-normal text-slate-400">
                      (opcional)
                    </span>
                  </label>
                  <input
                    id="alias"
                    name="alias"
                    value={form.alias}
                    onChange={handleChange}
                    autoComplete="off"
                    placeholder="Casa, trabajo, departamento..."
                    className={clasesCampo(false)}
                  />
                </div>

                <div>
                  <label
                    htmlFor="direccion"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Dirección exacta <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="direccion"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    aria-invalid={Boolean(errores.direccion)}
                    aria-describedby={
                      errores.direccion ? 'direccion-error' : undefined
                    }
                    autoComplete="street-address"
                    placeholder="Av. Los Próceres 123, Dpto. 402, Surco"
                    className={clasesCampo(Boolean(errores.direccion))}
                  />
                  <ErrorCampo
                    id="direccion-error"
                    mensaje={errores.direccion}
                  />
                </div>

                <div>
                  <label
                    htmlFor="referencia"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Referencia <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="referencia"
                    name="referencia"
                    value={form.referencia}
                    onChange={handleChange}
                    aria-invalid={Boolean(errores.referencia)}
                    aria-describedby={
                      errores.referencia ? 'referencia-error' : undefined
                    }
                    autoComplete="off"
                    placeholder="Frente al parque, edificio azul, timbre 402"
                    className={clasesCampo(Boolean(errores.referencia))}
                  />
                  <ErrorCampo
                    id="referencia-error"
                    mensaje={errores.referencia}
                  />
                </div>

                <div>
                  <label
                    htmlFor="ciudad"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="ciudad"
                    name="ciudad"
                    value={form.ciudad}
                    onChange={handleChange}
                    aria-invalid={Boolean(errores.ciudad)}
                    aria-describedby={
                      errores.ciudad ? 'ciudad-error' : undefined
                    }
                    className={clasesCampo(Boolean(errores.ciudad))}
                  >
                    <option value="">Selecciona tu ciudad</option>
                    {CIUDADES_ENVIO.map((ciudad) => (
                      <option key={ciudad.id} value={ciudad.id}>
                        {ciudad.nombre} ({ciudad.departamento})
                        {ciudad.cobertura ? '' : ' — sin cobertura'}
                      </option>
                    ))}
                  </select>
                  <ErrorCampo id="ciudad-error" mensaje={errores.ciudad} />

                  {ciudadSeleccionada ? (
                    <p
                      className={[
                        'mt-2 rounded-xl border px-4 py-3 text-sm font-semibold',
                        ciudadSeleccionada.cobertura
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-red-50 text-red-700',
                      ].join(' ')}
                    >
                      {ciudadSeleccionada.cobertura
                        ? `Cobertura disponible · Entrega estimada: ${ciudadSeleccionada.tiempo}.`
                        : `Lo sentimos, aún no tenemos cobertura de envío en ${ciudadSeleccionada.nombre}.`}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="celular"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Celular de contacto <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="celular"
                    name="celular"
                    type="tel"
                    inputMode="numeric"
                    maxLength="9"
                    value={form.celular}
                    onChange={handleChange}
                    aria-invalid={Boolean(errores.celular)}
                    aria-describedby={
                      errores.celular ? 'celular-error' : 'celular-hint'
                    }
                    autoComplete="tel-national"
                    placeholder="987654321"
                    className={clasesCampo(Boolean(errores.celular))}
                  />
                  {errores.celular ? (
                    <ErrorCampo id="celular-error" mensaje={errores.celular} />
                  ) : (
                    <p
                      id="celular-hint"
                      className="mt-1.5 text-xs text-slate-500"
                    >
                      9 dígitos numéricos, sin espacios ni símbolos.{' '}
                      {form.celular.length}/9
                    </p>
                  )}
                </div>
              </div>

              <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={guardarEnPerfil}
                  onChange={(event) => setGuardarEnPerfil(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Guardar esta dirección en mi perfil
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Podrás reutilizarla en tus próximas compras.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
              >
                Confirmar dirección de envío
              </button>
            </form>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-black text-slate-900">
              Resumen de entrega
            </h2>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Dirección
                </dt>
                <dd className="mt-1 leading-6 text-slate-700">
                  {form.direccion || 'Pendiente de completar'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Referencia
                </dt>
                <dd className="mt-1 leading-6 text-slate-700">
                  {form.referencia || 'Pendiente de completar'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Ciudad
                </dt>
                <dd className="mt-1 text-slate-700">
                  {ciudadSeleccionada
                    ? `${ciudadSeleccionada.nombre} (${ciudadSeleccionada.departamento})`
                    : 'Pendiente de seleccionar'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Celular
                </dt>
                <dd className="mt-1 text-slate-700">
                  {form.celular || 'Pendiente de completar'}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              {ciudadSeleccionada ? (
                coberturaDisponible ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    Cobertura de envío disponible.
                  </p>
                ) : (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    Sin cobertura de envío en {ciudadSeleccionada.nombre}.
                  </p>
                )
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  Selecciona una ciudad para verificar la cobertura.
                </p>
              )}
            </div>

            {direccionConfirmada ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-black text-emerald-800">
                  Dirección lista para el pedido
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  El repartidor usará estos datos de entrega y contacto.
                </p>
                {ciudadSeleccionada?.cobertura ? (
                  <p className="mt-2 text-xs font-bold text-emerald-800">
                    Costo de envío: S/.{' '}
                    {Number(ciudadSeleccionada.costoEnvio).toFixed(2)}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => onContinueToPayment(direccionConfirmada)}
                  className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                >
                  Continuar al pago
                </button>
                <button
                  type="button"
                  onClick={onOpenCarrito}
                  className="mt-2 w-full rounded-lg border border-emerald-300 px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                >
                  Volver al carrito
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  )
}

export default RegistroEnvio
