import { useState } from 'react'
import { agregarAlCarrito, useCarrito } from '../../data/carrito.js'
import {
  esProductoActivo,
  formatearPrecio,
  obtenerCategoria,
} from '../../data/productos.js'

function ProductoCard({ producto, onSelect }) {
  const activo = esProductoActivo(producto)
  const disponible = activo && producto.stock > 0
  const categoria = obtenerCategoria(producto.categoria)
  const carrito = useCarrito()
  const [error, setError] = useState('')

  const enCarrito =
    carrito.find((item) => item.productoId === producto.id)?.cantidad ?? 0
  const alcanzoStock = disponible && enCarrito >= producto.stock

  function handleAgregar() {
    setError('')

    try {
      agregarAlCarrito(producto.id, 1)
    } catch (agregarError) {
      setError(agregarError.message)
    }
  }

  let etiqueta = 'Agregar al carrito'
  if (!activo) etiqueta = 'No disponible'
  else if (!disponible) etiqueta = 'Agotado'
  else if (alcanzoStock) etiqueta = 'Máximo disponible'
  else if (enCarrito > 0) etiqueta = 'Agregar otra unidad'

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl">
      <button
        type="button"
        onClick={() => onSelect(producto.id)}
        className="block w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <img
            src={producto.imagen}
            alt={producto.titulo}
            loading="lazy"
            className={[
              'h-full w-full object-cover transition duration-500 group-hover:scale-105',
              disponible ? '' : 'opacity-70 saturate-50',
            ].join(' ')}
          />
          <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {categoria.nombre}
          </span>
          <span
            className={[
              'absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold',
              disponible
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700',
            ].join(' ')}
          >
            {!activo ? 'No disponible' : disponible ? 'Disponible' : 'Agotado'}
          </span>
        </div>

        <div className="px-5 pt-5">
          <h3 className="text-base font-bold leading-6 text-slate-900">
            {producto.titulo}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
            {producto.descripcion}
          </p>
        </div>
      </button>

      <div className="mt-auto p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Precio
            </p>
            <p className="text-xl font-black text-slate-900">
              {formatearPrecio(producto.precio)}
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600">
            {!activo
              ? 'No disponible'
              : disponible
                ? `${producto.stock} en stock`
                : 'Sin stock'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAgregar}
          disabled={!disponible || alcanzoStock}
          className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {etiqueta}
        </button>

        {enCarrito > 0 && disponible ? (
          <p
            aria-live="polite"
            className="mt-2 text-center text-xs font-semibold text-indigo-600"
          >
            {enCarrito} en tu carrito
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-2 text-center text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  )
}

export default ProductoCard
