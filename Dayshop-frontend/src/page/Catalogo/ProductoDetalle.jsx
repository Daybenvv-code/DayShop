import { useState } from 'react'
import { agregarAlCarrito, useCarrito } from '../../data/carrito.js'
import {
  esProductoActivo,
  formatearPrecio,
  obtenerCategoria,
  useProductos,
} from '../../data/productos.js'

function ProductoDetalle({ productoId, onBack }) {
  const productos = useProductos()
  const carrito = useCarrito()
  const [errorCarrito, setErrorCarrito] = useState('')
  const producto = productos.find((item) => item.id === productoId)

  if (!producto || !esProductoActivo(producto)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <p className="text-4xl">🔎</p>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
            Producto no disponible
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Puede que haya sido eliminado o deshabilitado desde el panel
            administrativo.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
          >
            Volver al catálogo
          </button>
        </div>
      </main>
    )
  }

  const categoria = obtenerCategoria(producto.categoria)
  const disponible = producto.stock > 0
  const especificaciones = Object.entries(producto.especificaciones ?? {})
  const enCarrito =
    carrito.find((item) => item.productoId === producto.id)?.cantidad ?? 0
  const alcanzoStock = disponible && enCarrito >= producto.stock

  function handleAgregar() {
    setErrorCarrito('')

    try {
      agregarAlCarrito(producto.id, 1)
    } catch (agregarError) {
      setErrorCarrito(agregarError.message)
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
              <p className="text-lg font-bold leading-tight">Detalle del producto</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            Volver al catálogo
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
        >
          ← Volver al catálogo
        </button>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <img
              src={producto.imagen}
              alt={producto.titulo}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                {categoria.nombre}
              </span>
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-bold',
                  disponible
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700',
                ].join(' ')}
              >
                {disponible
                  ? `Disponible · ${producto.stock} en stock`
                  : 'Agotado'}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {producto.titulo}
            </h1>

            <p className="mt-4 text-3xl font-black text-indigo-600">
              {formatearPrecio(producto.precio)}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAgregar}
                disabled={!disponible || alcanzoStock}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                {!disponible
                  ? 'Producto agotado'
                  : alcanzoStock
                    ? 'Máximo disponible en carrito'
                    : 'Agregar al carrito'}
              </button>

              {enCarrito > 0 && disponible ? (
                <span
                  aria-live="polite"
                  className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700"
                >
                  {enCarrito} en tu carrito
                </span>
              ) : null}
            </div>

            {errorCarrito ? (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {errorCarrito}
              </p>
            ) : null}

            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Descripción
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {producto.descripcion || 'Este producto aún no tiene descripción.'}
              </p>
            </div>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Especificaciones
              </h2>

              {especificaciones.length > 0 ? (
                <dl className="mt-3 divide-y divide-slate-100">
                  {especificaciones.map(([clave, valor]) => (
                    <div
                      key={clave}
                      className="flex items-start justify-between gap-6 py-2.5 text-sm"
                    >
                      <dt className="font-semibold text-slate-500">{clave}</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Sin especificaciones registradas.
                </p>
              )}
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Código de producto: <span className="font-mono">{producto.id}</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ProductoDetalle
