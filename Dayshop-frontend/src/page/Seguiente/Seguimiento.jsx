import { useEffect, useMemo, useState } from 'react'
import { obtenerCiudad } from '../../data/envios.js'
import { actualizarEstadoOrden, useOrdenes } from '../../data/ordenes.js'
import { formatearPrecio } from '../../data/productos.js'
import {
  ESTADOS_SEGUIMIENTO,
  obtenerEntregaEstimada,
  obtenerFechaEtapa,
  obtenerIndiceEstadoPorTiempo,
} from '../../data/seguimiento.js'

const ESTILO_ESTADO = {
  confirmado: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  preparando: 'border-amber-200 bg-amber-50 text-amber-700',
  en_camino: 'border-sky-200 bg-sky-50 text-sky-700',
  entregado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

function formatearHora(fecha) {
  if (!fecha || Number.isNaN(new Date(fecha).getTime())) return '--:--'

  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fecha))
}

function formatearFechaHora(fecha) {
  if (!fecha || Number.isNaN(new Date(fecha).getTime())) return 'Sin registro'

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

function formatearDuracion(segundos) {
  const segundosSeguros = Math.max(0, Math.trunc(segundos))
  const minutos = Math.floor(segundosSeguros / 60)
  const restantes = String(segundosSeguros % 60).padStart(2, '0')
  return `${minutos}:${restantes}`
}

function Cabecera({ onBack, onOpenCatalogo, onOpenCarrito }) {
  return (
    <header className="bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-base font-black shadow-lg shadow-indigo-600/30">
            D
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
              DayShop Delivery
            </p>
            <p className="text-lg font-bold leading-tight">Seguimiento</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCatalogo}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            Catálogo
          </button>
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
            Mi cuenta
          </button>
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Sigue tu pedido en tiempo real
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Consulta la etapa actual del reparto, el recorrido de tu compra y la
          hora estimada de llegada a tu domicilio.
        </p>
      </div>
    </header>
  )
}

function Seguimiento({
  session,
  numeroOrden,
  onBack,
  onOpenCatalogo,
  onOpenCarrito,
  onSelectOrder,
}) {
  const ordenes = useOrdenes()
  const userId = session?.id ?? session?.email ?? 'invitado'
  const [ahora, setAhora] = useState(() => Date.now())

  const ordenesCliente = useMemo(
    () => ordenes.filter((orden) => orden.userId === userId),
    [ordenes, userId],
  )

  const ordenActiva = useMemo(
    () =>
      ordenesCliente.find((orden) => orden.numero === numeroOrden) ??
      ordenesCliente[0] ??
      null,
    [numeroOrden, ordenesCliente],
  )

  const indiceGuardado = ordenActiva
    ? ESTADOS_SEGUIMIENTO.findIndex(
        (estado) => estado.id === ordenActiva.estado,
      )
    : -1
  const indicePorTiempo = ordenActiva
    ? obtenerIndiceEstadoPorTiempo(ordenActiva.creadaEn, ahora)
    : 0
  const indiceActual = ordenActiva
    ? Math.max(indiceGuardado, indicePorTiempo, 0)
    : 0
  const estadoActual =
    ESTADOS_SEGUIMIENTO[indiceActual] ?? ESTADOS_SEGUIMIENTO[0]
  const entregado = estadoActual.id === 'entregado'
  const ultimoEstado = ESTADOS_SEGUIMIENTO[ESTADOS_SEGUIMIENTO.length - 1]
  const entregaEstimada = ordenActiva
    ? obtenerEntregaEstimada(ordenActiva)
    : null
  const fechaEntrega = ordenActiva
    ? obtenerFechaEtapa(ordenActiva, ultimoEstado)
    : null
  const restanteSegundos = entregaEstimada
    ? Math.max(
        0,
        Math.ceil((entregaEstimada.getTime() - ahora) / 1000),
      )
    : 0
  const porcentaje = Math.round(
    (indiceActual / (ESTADOS_SEGUIMIENTO.length - 1)) * 100,
  )
  const ciudad = ordenActiva?.direccion?.ciudad
    ? obtenerCiudad(ordenActiva.direccion.ciudad)
    : null

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(intervalo)
  }, [])

  useEffect(() => {
    if (!ordenActiva) return

    const indiceEnOrden = ESTADOS_SEGUIMIENTO.findIndex(
      (estado) => estado.id === ordenActiva.estado,
    )

    if (indiceActual > indiceEnOrden) {
      actualizarEstadoOrden(
        ordenActiva.numero,
        ESTADOS_SEGUIMIENTO[indiceActual].id,
      )
    }
  }, [indiceActual, ordenActiva])

  if (!ordenActiva) {
    return (
      <main className="min-h-screen bg-slate-100">
        <Cabecera
          onBack={onBack}
          onOpenCatalogo={onOpenCatalogo}
          onOpenCarrito={onOpenCarrito}
        />

        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-3xl font-black text-slate-400">
              0
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-900">
              No tienes pedidos para seguir
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Cuando completes una compra, podrás visualizar aquí la etapa
              actual del reparto y la hora estimada de llegada.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onOpenCatalogo}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
              >
                Explorar catálogo
              </button>
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              >
                Volver a mi cuenta
              </button>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <Cabecera
        onBack={onBack}
        onOpenCatalogo={onOpenCatalogo}
        onOpenCarrito={onOpenCarrito}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {ordenesCliente.length > 1 ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Pedidos disponibles
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {ordenesCliente.length} pedidos registrados
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              Ver pedido
              <select
                value={ordenActiva.numero}
                onChange={(event) => onSelectOrder(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                {ordenesCliente.map((orden) => (
                  <option key={orden.numero} value={orden.numero}>
                    {orden.numero} · {formatearPrecio(orden.total)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                    Actualización en vivo
                  </p>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Pedido
                </p>
                <h2 className="mt-1 font-mono text-2xl font-black tracking-wide sm:text-3xl">
                  {ordenActiva.numero}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Realizado el {formatearFechaHora(ordenActiva.creadaEn)}
                </p>
              </div>

              <span
                className={[
                  'inline-flex items-center rounded-full border px-4 py-2 text-sm font-bold',
                  ESTILO_ESTADO[estadoActual.id] ??
                    'border-slate-200 bg-slate-50 text-slate-600',
                ].join(' ')}
              >
                {estadoActual.titulo}
              </span>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Etapa actual
                </p>
                <p className="mt-1 text-sm font-black">
                  {estadoActual.titulo}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {estadoActual.descripcion}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {entregado ? 'Entrega completada' : 'Llegada estimada'}
                </p>
                <p className="mt-1 text-sm font-black">
                  {entregado
                    ? formatearFechaHora(fechaEntrega)
                    : formatearHora(entregaEstimada)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {entregado
                    ? 'Pedido entregado en tu dirección'
                    : 'Horario aproximado del reparto'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {entregado ? 'Estado final' : 'Tiempo restante'}
                </p>
                <p
                  aria-live="polite"
                  className="mt-1 text-sm font-black tabular-nums"
                >
                  {entregado
                    ? 'Pedido entregado'
                    : formatearDuracion(restanteSegundos)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {entregado
                    ? 'Gracias por tu compra'
                    : 'Cuenta regresiva en vivo'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-linear-to-r from-indigo-400 to-emerald-400 transition-all duration-700"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>{estadoActual.descripcion}</span>
                <span>{porcentaje}%</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-black text-slate-900">
                Recorrido del pedido
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Última actualización: {formatearHora(ordenActiva.actualizadaEn)}
              </p>
            </div>

            <ol className="mt-6 grid gap-6 sm:grid-cols-4">
              {ESTADOS_SEGUIMIENTO.map((etapa, posicion) => {
                const completado = posicion < indiceActual
                const actual = posicion === indiceActual
                const fechaEtapa = obtenerFechaEtapa(ordenActiva, etapa)

                return (
                  <li
                    key={etapa.id}
                    className="relative flex gap-3 sm:flex-col sm:items-start"
                  >
                    {posicion < ESTADOS_SEGUIMIENTO.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className={[
                          'absolute left-5 top-5 hidden h-0.5 w-full sm:block',
                          completado ? 'bg-emerald-400' : 'bg-slate-200',
                        ].join(' ')}
                      />
                    ) : null}

                    <span
                      className={[
                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black',
                        completado
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : actual
                            ? 'border-indigo-500 bg-indigo-600 text-white ring-4 ring-indigo-100'
                            : 'border-slate-300 bg-white text-slate-400',
                      ].join(' ')}
                    >
                      {completado ? '✓' : posicion + 1}
                    </span>

                    <div className="min-w-0">
                      <p
                        className={[
                          'text-sm font-bold',
                          actual
                            ? 'text-indigo-700'
                            : completado
                              ? 'text-slate-900'
                              : 'text-slate-400',
                        ].join(' ')}
                      >
                        {etapa.titulo}
                      </p>
                      <p
                        className={[
                          'mt-1 text-xs leading-5',
                          actual ? 'text-slate-600' : 'text-slate-400',
                        ].join(' ')}
                      >
                        {etapa.descripcion}
                      </p>
                      <p
                        className={[
                          'mt-1 text-xs font-semibold',
                          actual ? 'text-indigo-600' : 'text-slate-400',
                        ].join(' ')}
                      >
                        {posicion < indiceActual
                          ? formatearHora(fechaEtapa)
                          : actual
                            ? 'En curso'
                            : 'Pendiente'}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">
              Productos del pedido
            </h3>

            <ul className="mt-5 divide-y divide-slate-100">
              {ordenActiva.items.map((item) => (
                <li
                  key={item.productoId}
                  className="flex items-center gap-3 py-3"
                >
                  <img
                    src={item.imagen}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {item.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.cantidad} × {formatearPrecio(item.precio)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-slate-900">
                    {formatearPrecio(item.subtotal)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-600">Subtotal de productos</dt>
                <dd className="font-bold text-slate-900">
                  {formatearPrecio(ordenActiva.subtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-600">Costo de envío</dt>
                <dd className="font-bold text-slate-900">
                  {formatearPrecio(ordenActiva.costoEnvio)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                <dt className="text-base font-black text-slate-900">
                  Total pagado
                </dt>
                <dd className="text-2xl font-black text-indigo-600">
                  {formatearPrecio(ordenActiva.total)}
                </dd>
              </div>
            </dl>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-900">
                Dirección de entrega
              </h3>

              {ordenActiva.direccion ? (
                <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                  <p className="font-bold text-slate-900">
                    {ordenActiva.direccion.alias || 'Dirección de envío'}
                  </p>
                  <p>{ordenActiva.direccion.direccion}</p>
                  <p>Ref. {ordenActiva.direccion.referencia}</p>
                  <p>
                    {ciudad
                      ? `${ciudad.nombre} (${ciudad.departamento})`
                      : ordenActiva.direccion.ciudad}
                  </p>
                  <p>Celular: {ordenActiva.direccion.celular}</p>
                  {ciudad?.tiempo ? (
                    <p className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                      Entrega estimada: {ciudad.tiempo}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No se registró una dirección para este pedido.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-900">
                Datos del pedido
              </h3>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Fecha de compra
                  </dt>
                  <dd className="mt-1 text-slate-700">
                    {formatearFechaHora(ordenActiva.creadaEn)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Código de orden
                  </dt>
                  <dd className="mt-1 font-mono text-xs font-bold text-indigo-600">
                    {ordenActiva.numero}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Estado actual
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-700">
                    {estadoActual.titulo}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={onOpenCatalogo}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                >
                  Seguir comprando
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  Volver a mi cuenta
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default Seguimiento
