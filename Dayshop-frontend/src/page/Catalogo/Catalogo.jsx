import { useMemo, useState } from 'react'
import { useCantidadCarrito } from '../../data/carrito.js'
import {
  CATEGORIAS,
  esProductoActivo,
  useProductos,
} from '../../data/productos.js'
import ProductoCard from './ProductoCard.jsx'

function Catalogo({
  esAdmin,
  onBack,
  onOpenAdmin,
  onOpenBuscador,
  onOpenCarrito,
  onSelectProduct,
}) {
  const productos = useProductos()
  const cantidadCarrito = useCantidadCarrito()
  const [categoriaActiva, setCategoriaActiva] = useState('todos')

  const productosVisibles = useMemo(
    () => productos.filter(esProductoActivo),
    [productos],
  )

  const categoriasConProductos = useMemo(
    () =>
      CATEGORIAS.map((categoria) => ({
        ...categoria,
        productos: productosVisibles.filter(
          (producto) => producto.categoria === categoria.id,
        ),
      })).filter((categoria) => categoria.productos.length > 0),
    [productosVisibles],
  )

  const categoriaVisible =
    categoriaActiva === 'todos' ||
    categoriasConProductos.some((categoria) => categoria.id === categoriaActiva)
      ? categoriaActiva
      : 'todos'

  const categoriasFiltradas =
    categoriaVisible === 'todos'
      ? categoriasConProductos
      : categoriasConProductos.filter(
          (categoria) => categoria.id === categoriaVisible,
        )

  const totalDisponibles = productosVisibles.filter(
    (producto) => producto.stock > 0,
  ).length

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
              <p className="text-lg font-bold leading-tight">Catálogo</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenBuscador}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={onOpenCarrito}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-300/40"
            >
              Carrito ({cantidadCarrito})
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Mi cuenta
            </button>
            {esAdmin ? (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-white/20"
              >
                Panel admin
              </button>
            ) : null}
          </nav>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
            Explora lo que DayShop tiene para ti
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Encuentra productos por categoría, revisa precios y stock disponible
            antes de elegir lo que necesitas.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-2 font-semibold text-slate-100">
              {productosVisibles.length} productos
            </span>
            <span className="rounded-full bg-emerald-400/15 px-4 py-2 font-semibold text-emerald-300">
              {totalDisponibles} disponibles
            </span>
            <span className="rounded-full bg-red-400/15 px-4 py-2 font-semibold text-red-300">
              {productosVisibles.length - totalDisponibles} agotados
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          aria-label="Filtrar productos por categoría"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            onClick={() => setCategoriaActiva('todos')}
            aria-pressed={categoriaVisible === 'todos'}
            className={[
              'rounded-full px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-indigo-200',
              categoriaVisible === 'todos'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600',
            ].join(' ')}
          >
            Todos ({productosVisibles.length})
          </button>

          {categoriasConProductos.map((categoria) => (
            <button
              key={categoria.id}
              type="button"
              onClick={() => setCategoriaActiva(categoria.id)}
              aria-pressed={categoriaVisible === categoria.id}
              className={[
                'rounded-full px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-indigo-200',
                categoriaVisible === categoria.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600',
              ].join(' ')}
            >
              {categoria.nombre} ({categoria.productos.length})
            </button>
          ))}
        </div>

        {productosVisibles.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-4xl">🛒</p>
            <h2 className="mt-4 text-2xl font-black text-slate-900">
              No hay productos publicados
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              {esAdmin
                ? 'Agrega o habilita productos desde el panel administrativo para que aparezcan aquí automáticamente.'
                : 'Vuelve más tarde para descubrir los productos disponibles.'}
            </p>
            <button
              type="button"
              onClick={esAdmin ? onOpenAdmin : onBack}
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
              {esAdmin ? 'Ir al panel admin' : 'Volver a mi cuenta'}
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-12">
            {categoriasFiltradas.map((categoria) => (
              <section
                key={categoria.id}
                aria-labelledby={`categoria-${categoria.id}`}
              >
                <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2
                      id={`categoria-${categoria.id}`}
                      className="text-xl font-black tracking-tight text-slate-900"
                    >
                      {categoria.nombre}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {categoria.descripcion}
                    </p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {categoria.productos.length}{' '}
                    {categoria.productos.length === 1 ? 'producto' : 'productos'}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoria.productos.map((producto) => (
                    <ProductoCard
                      key={producto.id}
                      producto={producto}
                      onSelect={onSelectProduct}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default Catalogo
