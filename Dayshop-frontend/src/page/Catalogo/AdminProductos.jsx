import { useState } from 'react'
import {
  CATEGORIAS,
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  formatearPrecio,
  obtenerCategoria,
  useProductos,
} from '../../data/productos.js'

const FORM_INICIAL = {
  titulo: '',
  categoria: CATEGORIAS[0].id,
  precio: '',
  stock: '',
  descripcion: '',
  especificaciones: '',
  imagen: '',
}

function parsearEspecificaciones(texto) {
  return texto
    .split('\n')
    .reduce((especificaciones, linea) => {
      const [clave, ...resto] = linea.split(':')
      const nombre = clave.trim()
      const valor = resto.join(':').trim()

      if (nombre && valor) especificaciones[nombre] = valor
      return especificaciones
    }, {})
}

function AdminProductos({ onBack }) {
  const productos = useProductos()
  const [form, setForm] = useState(FORM_INICIAL)
  const [editingId, setEditingId] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  function resetForm() {
    setForm(FORM_INICIAL)
    setEditingId(null)
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setMensaje(null)
  }

  function handleEdit(producto) {
    setEditingId(producto.id)
    setForm({
      titulo: producto.titulo,
      categoria: producto.categoria,
      precio: String(producto.precio),
      stock: String(producto.stock),
      descripcion: producto.descripcion,
      especificaciones: Object.entries(producto.especificaciones ?? {})
        .map(([clave, valor]) => `${clave}: ${valor}`)
        .join('\n'),
      imagen: '',
    })
    setMensaje(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSubmit(event) {
    event.preventDefault()

    const titulo = form.titulo.trim()
    const precio = Number(form.precio)
    const stock = Number(form.stock)

    if (!titulo) {
      setMensaje({ tipo: 'error', texto: 'El título del producto es obligatorio.' })
      return
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un precio mayor a cero.' })
      return
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setMensaje({
        tipo: 'error',
        texto: 'El stock debe ser un número entero igual o mayor a cero.',
      })
      return
    }

    if (!form.descripcion.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'La descripción es obligatoria para la vista de detalle.',
      })
      return
    }

    const datos = {
      titulo,
      categoria: form.categoria,
      precio,
      stock,
      descripcion: form.descripcion.trim(),
      especificaciones: parsearEspecificaciones(form.especificaciones),
    }

    if (form.imagen.trim()) datos.imagen = form.imagen.trim()

    try {
      if (editingId) {
        actualizarProducto(editingId, datos)
        setMensaje({
          tipo: 'success',
          texto: 'Producto actualizado. El catálogo ya refleja los cambios.',
        })
      } else {
        crearProducto(datos)
        setMensaje({
          tipo: 'success',
          texto: 'Producto agregado. El catálogo ya refleja los cambios.',
        })
      }

      resetForm()
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo guardar el producto.',
      })
    }
  }

  function handleDelete(producto) {
    const confirmado = window.confirm(
      `¿Eliminar "${producto.titulo}" del catálogo?`,
    )
    if (!confirmado) return

    try {
      eliminarProducto(producto.id)
      if (editingId === producto.id) resetForm()
      setMensaje({
        tipo: 'success',
        texto: 'Producto eliminado. El catálogo ya refleja los cambios.',
      })
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo eliminar el producto.',
      })
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'

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
              <p className="text-lg font-bold leading-tight">
                Panel administrativo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            Volver al catálogo
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Gestión de productos
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Agrega, edita precios o actualiza el stock. El catálogo se actualiza
            automáticamente, incluso si está abierto en otra pestaña.
          </p>
        </div>

        {mensaje ? (
          <div
            role="alert"
            className={[
              'mb-6 rounded-xl border px-4 py-3 text-sm',
              mensaje.tipo === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700',
            ].join(' ')}
          >
            {mensaje.texto}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900">
                {editingId ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm()
                    setMensaje(null)
                  }}
                  className="text-xs font-bold uppercase tracking-wide text-slate-500 transition hover:text-slate-800"
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="titulo"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Título
                </label>
                <input
                  id="titulo"
                  name="titulo"
                  value={form.titulo}
                  onChange={handleChange}
                  placeholder="Ej. Audífonos inalámbricos Pro"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="categoria"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Categoría
                  </label>
                  <select
                    id="categoria"
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    {CATEGORIAS.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="precio"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Precio (S/.)
                  </label>
                  <input
                    id="precio"
                    name="precio"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.precio}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="stock"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Stock
                  </label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={handleChange}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="imagen"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Imagen (URL opcional)
                  </label>
                  <input
                    id="imagen"
                    name="imagen"
                    type="url"
                    value={form.imagen}
                    onChange={handleChange}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                {editingId
                  ? 'Deja la imagen vacía para conservar la actual.'
                  : 'Si dejas la imagen vacía, se generará una imagen referencial.'}
              </p>

              <div>
                <label
                  htmlFor="descripcion"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  rows="3"
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Describe el producto para la vista de detalle."
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="especificaciones"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Especificaciones
                </label>
                <textarea
                  id="especificaciones"
                  name="especificaciones"
                  rows="4"
                  value={form.especificaciones}
                  onChange={handleChange}
                  placeholder={'Conectividad: Bluetooth 5.3\nGarantía: 12 meses'}
                  className={`${inputClass} font-mono text-xs`}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Una especificación por línea con el formato Clave: valor.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
              >
                {editingId ? 'Guardar cambios' : 'Agregar al catálogo'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900">
                Productos publicados
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {productos.length}
              </span>
            </div>

            {productos.length === 0 ? (
              <p className="mt-8 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                No hay productos publicados. Usa el formulario para agregar el
                primero.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-slate-100">
                {productos.map((producto) => (
                  <li
                    key={producto.id}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <img
                      src={producto.imagen}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {producto.titulo}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {obtenerCategoria(producto.categoria).nombre} ·{' '}
                        {formatearPrecio(producto.precio)} ·{' '}
                        {producto.stock > 0
                          ? `${producto.stock} en stock`
                          : 'Agotado'}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(producto)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(producto)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default AdminProductos
