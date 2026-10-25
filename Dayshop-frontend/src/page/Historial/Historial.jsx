import { useMemo, useState } from 'react'
import { agregarVariosAlCarrito } from '../../data/carrito.js'
import { obtenerCiudad } from '../../data/envios.js'
import {
  obtenerEstadoPedido,
  pedidoEstaCancelado,
  pedidoEstaCompletado,
} from '../../data/estadosPedido.js'
import { useOrdenes } from '../../data/ordenes.js'
import { formatearPrecio } from '../../data/productos.js'
import { descargarRecibo } from './recibo.js'

const ESTILO_ESTADO = {
  confirmado: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  preparando: 'border-amber-200 bg-amber-50 text-amber-700',
  en_camino: 'border-sky-200 bg-sky-50 text-sky-700',
  entregado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelado: 'border-red-200 bg-red-50 text-red-700',
}

const ESTILO_PUNTO = {
  confirmado: 'bg-indigo-500',
  preparando: 'bg-amber-500',
  en_camino: 'bg-sky-500',
  entregado: 'bg-emerald-500',
  cancelado: 'bg-red-500',
}

function formatearFecha(valor) {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return 'Sin registro'

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha)
}

function contarUnidades(pedido) {
  return pedido.items.reduce((total, item) => total + item.cantidad, 0)
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
            <p className="text-lg font-bold leading-tight">Historial</p>
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
          Mis pedidos anteriores
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Revisa el detalle de tus compras, consulta el estado de cada pedido,
          descarga tu boleta y vuelve a comprar tus productos favoritos.
        </p>
      </div>
    </header>
  )
}

function Historial({
  session,
  numeroInicial,
  onBack,
  onOpenCatalogo,
  onOpenCarrito,
  onOpenSeguimiento,
}) {
  const ordenes = useOrdenes()
  const userId = session?.id ?? session?.email ?? 'invitado'
  const [seleccionado, setSeleccionado] = useState(numeroInicial ?? null)
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState('')

  const pedidos = useMemo(
    () =>
      ordenes
        .filter((orden) => orden.userId === userId)
        .sort(
          (primero, segundo) =>
            new Date(segundo.creadaEn).getTime() -
            new Date(primero.creadaEn).getTime(),
        ),
    [ordenes, userId],
  )

  const pedidoActivo =
    pedidos.find((pedido) => pedido.numero === seleccionado) ??
    pedidos[0] ??
    null

  const completados = pedidos.filter(pedidoEstaCompletado).length
  const cancelados = pedidos.filter(pedidoEstaCancelado).length
  const estadoActivo = pedidoActivo
    ? obtenerEstadoPedido(pedidoActivo.estado)
    : null
  const pedidoActivoCancelado = pedidoActivo
    ? pedidoEstaCancelado(pedidoActivo)
    : false
  const direccion = pedidoActivo?.direccion ?? null
  const ciudad = direccion?.ciudad ? obtenerCiudad(direccion.ciudad) : null

  function seleccionarPedido(numero) {
    setSeleccionado(numero)
    setMensaje(null)
    setError('')
  }

  function handleRepetirPedido(pedido) {
    setMensaje(null)
    setError('')

    try {
      const resultado = agregarVariosAlCarrito(
        pedido.items.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
        })),
      )
      const unidades = resultado.agregados.reduce(
        (total, item) => total + item.cantidad,
        0,
      )

      let texto = `Se agregaron ${unidades} ${
        unidades === 1 ? 'unidad' : 'unidades'
      } al carrito.`

      if (resultado.ajustados.length > 0) {
        texto += ` ${resultado.ajustados.length} ${
          resultado.ajustados.length === 1
            ? 'producto se ajustó'
            : 'productos se ajustaron'
        } según el stock disponible.`
      }

      if (resultado.omitidos.length > 0) {
        texto += ` ${resultado.omitidos.length} ${
          resultado.omitidos.length === 1
            ? 'producto no se agregó'
            : 'productos no se agregaron'
        } por falta de disponibilidad.`
      }

      setMensaje({ tipo: 'exito', texto, mostrarCarrito: true })
    } catch (repetirError) {
      setError(
        repetirError.message ||
          'No se pudo repetir el pedido. Revisa la disponibilidad.',
      )
    }
  }

  function handleDescargarBoleta(pedido) {
    setMensaje(null)
    setError('')

    try {
      descargarRecibo(pedido, {
        nombreCompleto: session?.nombreCompleto,
        email: session?.email,
      })
      setMensaje({
        tipo: 'exito',
        texto: 'La boleta digital se descargó en formato HTML imprimible.',
      })
    } catch {
      setError('No se pudo generar la boleta. Intenta nuevamente.')
    }
  }

  if (pedidos.length === 0) {
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
              Aún no tienes pedidos anteriores
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Cuando completes tu primera compra, aparecerá aquí con su fecha,
              estado, monto total y todos los productos incluidos.
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
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Pedidos registrados
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              {pedidos.length}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Completados
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-700">
              {completados}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-red-600">
              Cancelados
            </p>
            <p className="mt-1 text-2xl font-black text-red-700">{cancelados}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.25fr] lg:items-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900">
                Pedidos anteriores
              </h2>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Más recientes primero
              </span>
            </div>

            <ul className="mt-5 space-y-3">
              {pedidos.map((pedido) => {
                const estado = obtenerEstadoPedido(pedido.estado)
                const activo = pedidoActivo?.numero === pedido.numero

                return (
                  <li key={pedido.numero}>
                    <button
                      type="button"
                      onClick={() => seleccionarPedido(pedido.numero)}
                      aria-pressed={activo}
                      className={[
                        'w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4',
                        activo
                          ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100'
                          : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 focus:ring-indigo-100',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-bold text-indigo-600">
                            {pedido.numero}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatearFecha(pedido.creadaEn)}
                          </p>
                        </div>
                        <span
                          className={[
                            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
                            ESTILO_ESTADO[pedido.estado] ??
                              'border-slate-200 bg-slate-50 text-slate-600',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'h-1.5 w-1.5 rounded-full',
                              ESTILO_PUNTO[pedido.estado] ?? 'bg-slate-400',
                            ].join(' ')}
                          />
                          {estado.titulo}
                        </span>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          {contarUnidades(pedido)}{' '}
                          {contarUnidades(pedido) === 1
                            ? 'unidad'
                            : 'unidades'}{' '}
                          · {pedido.items.length}{' '}
                          {pedido.items.length === 1 ? 'producto' : 'productos'}
                        </p>
                        <p className="text-lg font-black text-slate-900">
                          {formatearPrecio(pedido.total)}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {pedidoActivo ? (
            <aside className="space-y-6 lg:sticky lg:top-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Detalle del pedido
                    </p>
                    <h2 className="mt-1 font-mono text-xl font-black text-slate-900">
                      {pedidoActivo.numero}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatearFecha(pedidoActivo.creadaEn)}
                    </p>
                  </div>
                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold',
                      ESTILO_ESTADO[pedidoActivo.estado] ??
                        'border-slate-200 bg-slate-50 text-slate-600',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'h-2 w-2 rounded-full',
                        ESTILO_PUNTO[pedidoActivo.estado] ?? 'bg-slate-400',
                      ].join(' ')}
                    />
                    {estadoActivo?.titulo}
                  </span>
                </div>

                <p
                  className={[
                    'mt-4 rounded-xl border px-4 py-3 text-xs font-semibold leading-5',
                    pedidoActivoCancelado
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600',
                  ].join(' ')}
                >
                  {estadoActivo?.descripcion}
                </p>

                {mensaje?.tipo === 'exito' ? (
                  <div
                    role="status"
                    className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
                  >
                    <p>{mensaje.texto}</p>
                    {mensaje.mostrarCarrito ? (
                      <button
                        type="button"
                        onClick={onOpenCarrito}
                        className="mt-2 text-xs font-bold text-emerald-800 underline underline-offset-2"
                      >
                        Ir al carrito
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {error ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  >
                    {error}
                  </p>
                ) : null}

                <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-slate-500">
                  Productos incluidos
                </h3>

                <ul className="mt-3 divide-y divide-slate-100">
                  {pedidoActivo.items.map((item) => (
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

                <dl className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-600">Subtotal</dt>
                    <dd className="font-bold text-slate-900">
                      {formatearPrecio(pedidoActivo.subtotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-600">Envío</dt>
                    <dd className="font-bold text-slate-900">
                      {formatearPrecio(pedidoActivo.costoEnvio)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                    <dt className="text-base font-black text-slate-900">
                      Total gastado
                    </dt>
                    <dd className="text-2xl font-black text-indigo-600">
                      {formatearPrecio(pedidoActivo.total)}
                    </dd>
                  </div>
                </dl>

                {direccion ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    <p className="font-bold text-slate-900">
                      {direccion.alias || 'Dirección de entrega'}
                    </p>
                    <p>{direccion.direccion}</p>
                    <p>Ref. {direccion.referencia}</p>
                    <p>
                      {ciudad
                        ? `${ciudad.nombre} (${ciudad.departamento})`
                        : direccion.ciudad}
                    </p>
                    <p>Celular: {direccion.celular}</p>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleRepetirPedido(pedidoActivo)}
                    className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                  >
                    Repetir pedido
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDescargarBoleta(pedidoActivo)}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  >
                    Descargar boleta
                  </button>
                  {!pedidoActivoCancelado ? (
                    <button
                      type="button"
                      onClick={() => onOpenSeguimiento(pedidoActivo.numero)}
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 sm:col-span-2"
                    >
                      Ver seguimiento del pedido
                    </button>
                  ) : null}
                </div>

                <p className="mt-3 text-center text-xs text-slate-500">
                  La boleta se descarga como archivo HTML listo para imprimir.
                </p>
              </section>
            </aside>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default Historial
