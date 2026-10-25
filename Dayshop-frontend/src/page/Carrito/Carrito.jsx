import { useMemo } from 'react'
import {
  aumentarCantidad,
  eliminarDelCarrito,
  reducirCantidad,
  useCarrito,
  vaciarCarrito,
} from '../../data/carrito.js'
import {
  esProductoActivo,
  formatearPrecio,
  obtenerCategoria,
  useProductos,
} from '../../data/productos.js'

function Carrito({ onBack, onOpenCatalogo, onOpenBuscador, onOpenEnvio }) {
  const carrito = useCarrito()
  const productos = useProductos()

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

  function handleVaciar() {
    const confirmado = window.confirm(
      '¿Seguro que deseas eliminar todos los productos del carrito?',
    )
    if (confirmado) vaciarCarrito()
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-base font-black shadow-lg shadow-indigo-600/30">
              D
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
                DayShop
              </p>
              <p className="text-lg font-bold leading-tight">Carrito</p>
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
              onClick={onOpenBuscador}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Buscador
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

        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Tu carrito de compras
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Revisa el detalle, ajusta las cantidades y confirma el costo total
            antes de realizar tu pedido.
          </p>
          <p className="mt-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100">
            {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'} en el
            carrito
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {lineas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-5xl">🛒</p>
            <h2 className="mt-4 text-2xl font-black text-slate-900">
              Tu carrito está vacío
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Agrega productos desde el catálogo o utiliza el buscador para
              encontrar lo que necesitas.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onOpenCatalogo}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
              >
                Ver catálogo
              </button>
              <button
                type="button"
                onClick={onOpenBuscador}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              >
                Buscar productos
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
            <section aria-label="Productos en el carrito" className="space-y-4">
              {lineas.map((linea) => (
                <article
                  key={linea.productoId}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  {linea.producto ? (
                    <div className="flex gap-4">
                      <img
                        src={linea.producto.imagen}
                        alt={linea.producto.titulo}
                        className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
                      />

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                              {obtenerCategoria(linea.producto.categoria).nombre}
                            </p>
                            <h2 className="mt-1 text-base font-bold leading-6 text-slate-900">
                              {linea.producto.titulo}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatearPrecio(linea.producto.precio)} c/u
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {linea.producto.stock > 0
                                ? `${linea.producto.stock} disponibles`
                                : 'Sin stock'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              eliminarDelCarrito(linea.productoId)
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
                          >
                            Eliminar
                          </button>
                        </div>

                        {linea.inactivo ||
                        linea.excedeStock ||
                        linea.producto.stock <= 0 ? (
                          <p
                            role="alert"
                            className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                          >
                            {linea.inactivo
                              ? 'Este producto ya no está a la venta. Elimínalo para continuar.'
                              : linea.producto.stock <= 0
                                ? 'Este producto se encuentra agotado. Elimínalo para continuar.'
                                : `Solo quedan ${linea.producto.stock} unidades. Reduce la cantidad.`}
                          </p>
                        ) : null}

                        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => reducirCantidad(linea.productoId)}
                              disabled={linea.cantidad <= 1}
                              aria-label={`Reducir cantidad de ${linea.producto.titulo}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                            >
                              −
                            </button>
                            <span
                              aria-live="polite"
                              className="min-w-10 text-center text-sm font-black text-slate-900"
                            >
                              {linea.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => aumentarCantidad(linea.productoId)}
                              disabled={
                                linea.inactivo ||
                                linea.cantidad >= linea.producto.stock ||
                                linea.producto.stock <= 0
                              }
                              aria-label={`Aumentar cantidad de ${linea.producto.titulo}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Subtotal
                            </p>
                            <p className="text-lg font-black text-slate-900">
                              {formatearPrecio(linea.subtotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Producto no disponible
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Este producto ya no forma parte del catálogo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarDelCarrito(linea.productoId)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <h2 className="text-lg font-black text-slate-900">
                Resumen de compra
              </h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-600">
                    Subtotal ({totalUnidades}{' '}
                    {totalUnidades === 1 ? 'unidad' : 'unidades'})
                  </dt>
                  <dd className="font-bold text-slate-900">
                    {formatearPrecio(subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-600">Envío</dt>
                  <dd className="text-right text-xs font-semibold text-slate-500">
                    Se calcula al confirmar la dirección
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                  <dt className="text-base font-black text-slate-900">
                    Total productos
                  </dt>
                  <dd className="text-2xl font-black text-indigo-600">
                    {formatearPrecio(subtotal)}
                  </dd>
                </div>
              </dl>

              <p className="mt-2 text-xs text-slate-500">
                Precio de productos en soles. El costo de envío se suma al
                confirmar la dirección de entrega.
              </p>

              {hayProblemasDeStock ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-700"
                >
                  Hay productos deshabilitados o sin stock suficiente. Ajusta
                  las cantidades o elimínalos antes de confirmar tu pedido.
                </p>
              ) : null}

              <button
                type="button"
                onClick={onOpenEnvio}
                disabled={hayProblemasDeStock}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                Continuar con la entrega
              </button>
              <button
                type="button"
                onClick={handleVaciar}
                className="mt-3 w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
              >
                Vaciar carrito
              </button>
              <button
                type="button"
                onClick={onOpenCatalogo}
                className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                Seguir comprando
              </button>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}

export default Carrito
