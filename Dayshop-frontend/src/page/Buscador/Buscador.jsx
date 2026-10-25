import { useMemo, useState } from 'react'
import { useCantidadCarrito } from '../../data/carrito.js'
import {
  CATEGORIAS,
  esProductoActivo,
  useProductos,
} from '../../data/productos.js'
import ProductoCard from '../Catalogo/ProductoCard.jsx'
import ProductoDetalle from '../Catalogo/ProductoDetalle.jsx'

function normalizarTexto(valor) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function convertirPrecio(valor) {
  if (valor.trim() === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

function Buscador({ onBack, onOpenCatalogo, onOpenCarrito }) {
  const productos = useProductos()
  const cantidadCarrito = useCantidadCarrito()
  const [busqueda, setBusqueda] = useState('')
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([])
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)

  const productosVisibles = useMemo(
    () => productos.filter(esProductoActivo),
    [productos],
  )

  const precioMinimo = convertirPrecio(precioMin)
  const precioMaximo = convertirPrecio(precioMax)
  const rangoInvalido =
    precioMinimo !== null &&
    precioMaximo !== null &&
    precioMinimo > precioMaximo

  const resultados = useMemo(() => {
    const termino = normalizarTexto(busqueda)
    const minimo = convertirPrecio(precioMin)
    const maximo = convertirPrecio(precioMax)

    return productosVisibles.filter((producto) => {
      const coincideTexto =
        !termino ||
        normalizarTexto(producto.titulo).includes(termino) ||
        normalizarTexto(producto.descripcion).includes(termino)

      const coincideCategoria =
        categoriasSeleccionadas.length === 0 ||
        categoriasSeleccionadas.includes(producto.categoria)

      const coincideMinimo = minimo === null || producto.precio >= minimo
      const coincideMaximo = maximo === null || producto.precio <= maximo

      return (
        coincideTexto &&
        coincideCategoria &&
        coincideMinimo &&
        coincideMaximo
      )
    })
  }, [productosVisibles, busqueda, categoriasSeleccionadas, precioMin, precioMax])

  const conteoPorCategoria = useMemo(
    () =>
      productosVisibles.reduce((conteo, producto) => {
        conteo[producto.categoria] = (conteo[producto.categoria] ?? 0) + 1
        return conteo
      }, {}),
    [productosVisibles],
  )

  const hayFiltros =
    busqueda.trim() !== '' ||
    categoriasSeleccionadas.length > 0 ||
    precioMin.trim() !== '' ||
    precioMax.trim() !== ''

  function alternarCategoria(id) {
    setCategoriasSeleccionadas((seleccionadas) =>
      seleccionadas.includes(id)
        ? seleccionadas.filter((categoria) => categoria !== id)
        : [...seleccionadas, id],
    )
  }

  function limpiarFiltros() {
    setBusqueda('')
    setCategoriasSeleccionadas([])
    setPrecioMin('')
    setPrecioMax('')
  }

  if (productoSeleccionado) {
    return (
      <ProductoDetalle
        productoId={productoSeleccionado}
        onBack={() => setProductoSeleccionado(null)}
      />
    )
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'

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
              <p className="text-lg font-bold leading-tight">Buscador</p>
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
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-300/40"
            >
              Carrito ({cantidadCarrito})
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
          <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
            Encuentra tu próximo producto
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Busca por nombre o descripción y combina categorías y rango de
            precios para llegar más rápido a lo que necesitas.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label
            htmlFor="busqueda"
            className="block text-sm font-bold text-slate-800"
          >
            Buscar producto
          </label>
          <div className="relative mt-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="busqueda"
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Ej. audífonos, mochila, café..."
              className={`${inputClass} pl-12`}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            La búsqueda no distingue mayúsculas ni tildes y revisa el nombre y la
            descripción.
          </p>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">Filtros</h2>
            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={!hayFiltros}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <fieldset>
              <legend className="text-sm font-bold text-slate-800">
                Categorías
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoriasSeleccionadas([])}
                  aria-pressed={categoriasSeleccionadas.length === 0}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-indigo-200',
                    categoriasSeleccionadas.length === 0
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600',
                  ].join(' ')}
                >
                  Todas ({productosVisibles.length})
                </button>

                {CATEGORIAS.map((categoria) => {
                  const activa = categoriasSeleccionadas.includes(categoria.id)
                  const cantidad = conteoPorCategoria[categoria.id] ?? 0

                  return (
                    <button
                      key={categoria.id}
                      type="button"
                      onClick={() => alternarCategoria(categoria.id)}
                      aria-pressed={activa}
                      className={[
                        'rounded-full px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-indigo-200',
                        activa
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600',
                      ].join(' ')}
                    >
                      {categoria.nombre} ({cantidad})
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Puedes seleccionar más de una categoría.
              </p>
            </fieldset>

            <div>
              <p className="text-sm font-bold text-slate-800">
                Rango de precios (S/.)
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="precioMin"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Mínimo
                  </label>
                  <input
                    id="precioMin"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={precioMin}
                    onChange={(event) => setPrecioMin(event.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="precioMax"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Máximo
                  </label>
                  <input
                    id="precioMax"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={precioMax}
                    onChange={(event) => setPrecioMax(event.target.value)}
                    placeholder="999.99"
                    className={inputClass}
                  />
                </div>
              </div>
              {rangoInvalido ? (
                <p role="alert" className="mt-2 text-sm text-red-600">
                  El precio mínimo no puede ser mayor que el máximo.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div aria-live="polite">
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              Resultados
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {resultados.length}{' '}
              {resultados.length === 1
                ? 'producto encontrado'
                : 'productos encontrados'}
            </p>
          </div>
        </div>

        {resultados.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <p className="text-4xl">🔍</p>
            <h3 className="mt-4 text-2xl font-black text-slate-900">
              No se encontraron productos
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Prueba con otro término de búsqueda o ajusta las categorías y el
              rango de precios.
            </p>
            {hayFiltros ? (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resultados.map((producto) => (
              <ProductoCard
                key={producto.id}
                producto={producto}
                onSelect={setProductoSeleccionado}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default Buscador
