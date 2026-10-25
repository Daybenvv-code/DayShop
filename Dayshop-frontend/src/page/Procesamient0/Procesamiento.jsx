import { useMemo, useState } from 'react'
import { useCarrito, vaciarCarrito } from '../../data/carrito.js'
import { obtenerCiudad } from '../../data/envios.js'
import { crearOrden } from '../../data/ordenes.js'
import {
  descontarStock,
  esProductoActivo,
  formatearPrecio,
  obtenerCategoria,
  useProductos,
} from '../../data/productos.js'

function formatearFecha(valor) {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ''

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(fecha)
}

function Confirmacion({
  orden,
  onOpenCatalogo,
  onOpenCuenta,
  onOpenSeguimiento,
}) {
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-base font-black shadow-lg shadow-emerald-500/30">
            ✓
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              DayShop
            </p>
            <p className="text-lg font-bold leading-tight">Compra confirmada</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-600">
            ✓
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            ¡Compra realizada con éxito!
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Tu pedido fue registrado correctamente y tus productos quedaron
            reservados en el sistema.
          </p>

          <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-4">
            <span className="text-xs font-bold uppercase tracking-wide text-indigo-500">
              Número de orden
            </span>
            <span className="mt-1 text-xl font-black tracking-wide text-indigo-700">
              {orden.numero}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Fecha de compra: {formatearFecha(orden.creadaEn)}
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              Resumen de productos
            </h2>

            <ul className="mt-5 divide-y divide-slate-100">
              {orden.items.map((item) => (
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
                  {formatearPrecio(orden.subtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-600">Costo de envío</dt>
                <dd className="font-bold text-slate-900">
                  {formatearPrecio(orden.costoEnvio)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                <dt className="text-base font-black text-slate-900">
                  Total pagado
                </dt>
                <dd className="text-2xl font-black text-indigo-600">
                  {formatearPrecio(orden.total)}
                </dd>
              </div>
            </dl>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">
                Datos de entrega
              </h2>

              {orden.direccion ? (
                <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                  <p className="font-bold text-slate-900">
                    {orden.direccion.alias || 'Dirección de envío'}
                  </p>
                  <p>{orden.direccion.direccion}</p>
                  <p>Ref. {orden.direccion.referencia}</p>
                  <p>
                    {orden.direccion.ciudad
                      ? obtenerCiudad(orden.direccion.ciudad)?.nombre ??
                        orden.direccion.ciudad
                      : 'Ciudad no registrada'}
                  </p>
                  <p>Celular: {orden.direccion.celular}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No se registró una dirección para esta orden.
                </p>
              )}
            </section>

            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <button
                type="button"
                onClick={() => onOpenSeguimiento(orden.numero)}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
              >
                Seguir mi pedido
              </button>
              <button
                type="button"
                onClick={onOpenCatalogo}
                className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              >
                Seguir comprando
              </button>
              <button
                type="button"
                onClick={onOpenCuenta}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              >
                Ir a mi cuenta
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

function Procesamiento({
  session,
  envio,
  onBack,
  onOpenCarrito,
  onOpenCatalogo,
  onOpenCuenta,
  onOpenSeguimiento,
}) {
  const carrito = useCarrito()
  const productos = useProductos()
  const [orden, setOrden] = useState(null)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(false)

  const lineas = useMemo(
    () =>
      carrito.map((item) => {
        const producto =
          productos.find((candidato) => candidato.id === item.productoId) ?? null
        const excedeStock = Boolean(producto) && item.cantidad > producto.stock
        const inactivo = Boolean(producto) && !esProductoActivo(producto)

        return {
          ...item,
          producto,
          excedeStock,
          inactivo,
          subtotal: producto ? producto.precio * item.cantidad : 0,
        }
      }),
    [carrito, productos],
  )

  const totalUnidades = carrito.reduce(
    (total, item) => total + item.cantidad,
    0,
  )
  const subtotal = lineas.reduce(
    (acumulado, linea) => acumulado + linea.subtotal,
    0,
  )
  const hayProblemasDeStock = lineas.some(
    (linea) =>
      !linea.producto ||
      linea.inactivo ||
      linea.excedeStock ||
      linea.producto.stock <= 0,
  )

  const ciudad = envio ? obtenerCiudad(envio.ciudad) : null
  const tieneCobertura = Boolean(ciudad?.cobertura)
  const costoEnvio = tieneCobertura ? Number(ciudad.costoEnvio) : 0
  const total = subtotal + costoEnvio
  const carritoVacio = carrito.length === 0
  const puedeComprar =
    !carritoVacio &&
    !hayProblemasDeStock &&
    tieneCobertura &&
    Boolean(envio) &&
    !procesando

  function handleConfirmar() {
    setError('')

    if (carritoVacio) {
      setError('Tu carrito está vacío. Agrega productos antes de comprar.')
      return
    }

    if (!envio) {
      setError('Selecciona una dirección de envío antes de confirmar la compra.')
      return
    }

    if (!tieneCobertura) {
      setError('La dirección seleccionada no tiene cobertura de envío.')
      return
    }

    if (hayProblemasDeStock) {
      setError(
        'Algunos productos ya no están disponibles o no tienen stock suficiente. Revisa tu carrito.',
      )
      return
    }

    setProcesando(true)

    try {
      const items = lineas.map((linea) => {
        if (!linea.producto) {
          throw new Error('Uno de los productos ya no está disponible.')
        }

        return {
          productoId: linea.productoId,
          titulo: linea.producto.titulo,
          imagen: linea.producto.imagen,
          precio: linea.producto.precio,
          cantidad: linea.cantidad,
          subtotal: linea.subtotal,
        }
      })

      descontarStock(items)

      const nuevaOrden = crearOrden({
        userId: session?.id ?? session?.email ?? 'invitado',
        items,
        direccion: envio,
        subtotal,
        costoEnvio,
        total,
      })

      vaciarCarrito()
      setOrden(nuevaOrden)
    } catch (compraError) {
      setError(
        compraError.message || 'No se pudo completar la compra. Intenta de nuevo.',
      )
    } finally {
      setProcesando(false)
    }
  }

  if (orden) {
    return (
      <Confirmacion
        orden={orden}
        onOpenCatalogo={onOpenCatalogo}
        onOpenCuenta={onOpenCuenta}
        onOpenSeguimiento={onOpenSeguimiento}
      />
    )
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
                DayShop Delivery
              </p>
              <p className="text-lg font-bold leading-tight">
                Confirmar compra
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Cambiar dirección
            </button>
            <button
              type="button"
              onClick={onOpenCarrito}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Carrito
            </button>
          </nav>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Confirma el pago de tu pedido
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Revisa el desglose de productos y envío. Al confirmar, reservaremos
            tus productos y generaremos tu número de orden.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-900">
                  Dirección de entrega
                </h2>
                <button
                  type="button"
                  onClick={onBack}
                  className="text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
                >
                  {envio ? 'Cambiar dirección' : 'Registrar dirección'}
                </button>
              </div>

              {envio ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  <p className="font-bold text-slate-900">
                    {envio.alias || 'Dirección de envío'}
                  </p>
                  <p>{envio.direccion}</p>
                  <p>Ref. {envio.referencia}</p>
                  <p>
                    {ciudad
                      ? `${ciudad.nombre} (${ciudad.departamento})`
                      : 'Ciudad no registrada'}
                  </p>
                  <p>Celular: {envio.celular}</p>
                  {ciudad?.cobertura ? (
                    <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      Cobertura disponible · {ciudad.tiempo}
                    </p>
                  ) : (
                    <p className="mt-2 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                      Sin cobertura de envío
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                  <p className="font-bold">Aún no has seleccionado una dirección.</p>
                  <p className="mt-1">
                    Necesitamos tus datos de entrega para calcular el costo de
                    envío y confirmar la compra.
                  </p>
                  <button
                    type="button"
                    onClick={onBack}
                    className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-200"
                  >
                    Registrar dirección
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Productos del pedido
                </h2>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'}
                </span>
              </div>

              {carritoVacio ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
                  <p className="text-4xl">🛒</p>
                  <h3 className="mt-3 text-xl font-black text-slate-900">
                    Tu carrito está vacío
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Agrega productos desde el catálogo o el buscador para poder
                    confirmar una compra.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenCatalogo}
                    className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                  >
                    Ver catálogo
                  </button>
                </div>
              ) : (
                <ul className="mt-5 divide-y divide-slate-100">
                  {lineas.map((linea) => (
                    <li
                      key={linea.productoId}
                      className="flex items-center gap-3 py-4"
                    >
                      {linea.producto ? (
                        <img
                          src={linea.producto.imagen}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                          🚫
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {linea.producto
                            ? linea.producto.titulo
                            : 'Producto no disponible'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {linea.producto
                            ? `${obtenerCategoria(linea.producto.categoria).nombre} · ${formatearPrecio(
                                linea.producto.precio,
                              )} c/u`
                            : 'Elimínalo desde el carrito para continuar'}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Cantidad: {linea.cantidad}
                        </p>
                        {linea.producto && linea.inactivo ? (
                          <p className="mt-1 text-xs font-bold text-amber-700">
                            Producto deshabilitado. Elimínalo desde el carrito.
                          </p>
                        ) : linea.producto && linea.excedeStock ? (
                          <p className="mt-1 text-xs font-bold text-amber-700">
                            Solo quedan {linea.producto.stock} unidades.
                          </p>
                        ) : null}
                      </div>

                      <p className="shrink-0 text-sm font-black text-slate-900">
                        {formatearPrecio(linea.subtotal)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-black text-slate-900">
              Desglose del pago
            </h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-600">
                  Subtotal productos ({totalUnidades}{' '}
                  {totalUnidades === 1 ? 'unidad' : 'unidades'})
                </dt>
                <dd className="font-bold text-slate-900">
                  {formatearPrecio(subtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-600">
                  Costo de envío
                  {ciudad ? ` (${ciudad.nombre})` : ''}
                </dt>
                <dd className="font-bold text-slate-900">
                  {envio && tieneCobertura
                    ? formatearPrecio(costoEnvio)
                    : 'Por calcular'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                <dt className="text-base font-black text-slate-900">
                  Total a pagar
                </dt>
                <dd className="text-2xl font-black text-indigo-600">
                  {formatearPrecio(total)}
                </dd>
              </div>
            </dl>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Precio final en soles. El total incluye los productos y el costo
              de delivery.
            </p>

            {hayProblemasDeStock && !carritoVacio ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-700"
              >
                Hay productos deshabilitados, sin stock suficiente o que ya no
                están disponibles. Ajusta tu carrito antes de comprar.
              </p>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleConfirmar}
              disabled={!puedeComprar}
              className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {procesando
                ? 'Procesando compra...'
                : carritoVacio
                  ? 'Carrito vacío'
                  : !envio
                    ? 'Selecciona una dirección'
                    : !tieneCobertura
                      ? 'Sin cobertura de envío'
                      : hayProblemasDeStock
                        ? 'Revisa el stock'
                        : 'Confirmar compra'}
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              Al confirmar, descontaremos el stock y generaremos tu número de
              orden.
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default Procesamiento
