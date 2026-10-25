import { useMemo, useState } from 'react'
import {
  CATEGORIAS,
  actualizarProducto,
  cambiarDisponibilidadProducto,
  crearProducto,
  eliminarProducto,
  esProductoActivo,
  formatearPrecio,
  obtenerCategoria,
  useProductos,
} from '../../data/productos.js'
import { esAdministrador } from '../../data/usuarios.js'

const FORM_INICIAL = {
  titulo: '',
  categoria: CATEGORIAS[0].id,
  precio: '',
  stock: '',
  descripcion: '',
  especificaciones: '',
  imagen: '',
  activo: true,
}

const MAX_IMAGEN_BYTES = 900 * 1024

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'

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

function AccesoRestringido({ onBack }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 text-center shadow-2xl shadow-slate-950/40 sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl font-black text-red-600">
          !
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-red-600">
          DayShop
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
          Acceso restringido
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Esta sección solo está disponible para usuarios con rol Administrador.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
        >
          Volver al catálogo
        </button>
      </section>
    </main>
  )
}

function Panel({ session, onBack }) {
  const productos = useProductos()
  const [form, setForm] = useState({ ...FORM_INICIAL })
  const [editingId, setEditingId] = useState(null)
  const [imagenActual, setImagenActual] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    return productos.filter((producto) => {
      const activo = esProductoActivo(producto)
      const coincideEstado =
        filtro === 'todos' ||
        (filtro === 'activos' && activo) ||
        (filtro === 'inactivos' && !activo)
      const coincideTexto =
        !termino || producto.titulo.toLowerCase().includes(termino)

      return coincideEstado && coincideTexto
    })
  }, [productos, filtro, busqueda])

  const publicados = productos.filter(esProductoActivo).length
  const deshabilitados = productos.length - publicados
  const agotados = productos.filter(
    (producto) => esProductoActivo(producto) && producto.stock <= 0,
  ).length

  if (!esAdministrador(session)) {
    return <AccesoRestringido onBack={onBack} />
  }

  function resetForm() {
    setForm({ ...FORM_INICIAL })
    setEditingId(null)
    setImagenActual('')
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setMensaje(null)
  }

  function handleImageFile(event) {
    const input = event.target
    const file = input.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMensaje({
        tipo: 'error',
        texto: 'Selecciona un archivo de imagen válido.',
      })
      input.value = ''
      return
    }

    if (file.size > MAX_IMAGEN_BYTES) {
      setMensaje({
        tipo: 'error',
        texto: 'La imagen no puede superar los 900 KB.',
      })
      input.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const resultado = typeof reader.result === 'string' ? reader.result : ''
      if (!resultado) {
        setMensaje({
          tipo: 'error',
          texto: 'No se pudo leer la imagen seleccionada.',
        })
        return
      }
      setForm((current) => ({ ...current, imagen: resultado }))
      setMensaje(null)
    }
    reader.onerror = () => {
      setMensaje({
        tipo: 'error',
        texto: 'No se pudo leer la imagen seleccionada.',
      })
    }
    reader.readAsDataURL(file)
    input.value = ''
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
      activo: esProductoActivo(producto),
    })
    setImagenActual(producto.imagen)
    setMensaje(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSubmit(event) {
    event.preventDefault()

    const titulo = form.titulo.trim()
    const precio = Number(form.precio)
    const stock = Number(form.stock)

    if (!titulo) {
      setMensaje({
        tipo: 'error',
        texto: 'El título del producto es obligatorio.',
      })
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
      activo: form.activo,
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

  function handleToggle(producto) {
    try {
      const actualizado = cambiarDisponibilidadProducto(
        producto.id,
        !esProductoActivo(producto),
      )

      if (editingId === producto.id) {
        setForm((current) => ({
          ...current,
          activo: esProductoActivo(actualizado),
        }))
      }

      setMensaje({
        tipo: 'success',
        texto: esProductoActivo(actualizado)
          ? 'Producto habilitado y visible en el catálogo.'
          : 'Producto deshabilitado. Ya no aparece en el catálogo.',
      })
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo cambiar la disponibilidad.',
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

  const imagenPreview = form.imagen.trim() || imagenActual

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-base font-black shadow-lg shadow-emerald-500/30">
              D
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                DayShop
              </p>
              <p className="text-lg font-bold leading-tight">
                Panel de administración
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-300">
              Administrador
            </span>
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Volver al catálogo
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Gestión de productos
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Crea productos, edita precios, cambia imágenes, actualiza el stock
              y controla qué artículos están disponibles para la venta.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Sesión activa
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {session.nombreCompleto}
            </p>
            <p className="text-xs text-slate-500">{session.email}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Total
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              {productos.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Productos registrados</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Publicados
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-700">
              {publicados}
            </p>
            <p className="mt-1 text-xs text-emerald-700/70">
              Visibles en el catálogo
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
              Deshabilitados
            </p>
            <p className="mt-1 text-2xl font-black text-amber-700">
              {deshabilitados}
            </p>
            <p className="mt-1 text-xs text-amber-700/70">
              Ocultos para los clientes
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-red-600">
              Agotados
            </p>
            <p className="mt-1 text-2xl font-black text-red-700">{agotados}</p>
            <p className="mt-1 text-xs text-red-700/70">
              Publicados sin stock
            </p>
          </div>
        </div>

        {mensaje ? (
          <div
            role="alert"
            className={[
              'mt-6 rounded-xl border px-4 py-3 text-sm font-semibold',
              mensaje.tipo === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700',
            ].join(' ')}
          >
            {mensaje.texto}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingId ? 'Editar producto' : 'Nuevo producto'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {editingId
                    ? 'Los cambios se reflejan al guardar.'
                    : 'Completa los datos para publicarlo.'}
                </p>
              </div>
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

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={form.activo}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Disponible para la venta
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      Si lo desactivas, se oculta del catálogo y no se puede
                      comprar.
                    </span>
                  </span>
                </label>
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

                <div className="mt-3">
                  <label
                    htmlFor="imagenArchivo"
                    className="block text-xs font-bold uppercase tracking-wide text-slate-500"
                  >
                    O subir una imagen
                  </label>
                  <input
                    id="imagenArchivo"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    JPG, PNG, WEBP o SVG. Máximo 900 KB.
                  </p>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {imagenPreview ? (
                    <img
                      src={imagenPreview}
                      alt="Vista previa del producto"
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-xs font-semibold text-slate-400">
                      Sin imagen seleccionada
                    </div>
                  )}
                </div>

                <p className="mt-1.5 text-xs text-slate-500">
                  {editingId
                    ? 'Deja la imagen vacía para conservar la actual.'
                    : 'Si no agregas una imagen, se generará una referencial.'}
                </p>
              </div>

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
              <h2 className="text-lg font-black text-slate-900">Inventario</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {productosFiltrados.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por título..."
                aria-label="Buscar producto en el inventario"
                className={inputClass}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFiltro('todos')}
                  aria-pressed={filtro === 'todos'}
                  className={[
                    'rounded-full px-3 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-indigo-200',
                    filtro === 'todos'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600',
                  ].join(' ')}
                >
                  Todos ({productos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltro('activos')}
                  aria-pressed={filtro === 'activos'}
                  className={[
                    'rounded-full px-3 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-emerald-200',
                    filtro === 'activos'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
                  ].join(' ')}
                >
                  Publicados ({publicados})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltro('inactivos')}
                  aria-pressed={filtro === 'inactivos'}
                  className={[
                    'rounded-full px-3 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-amber-200',
                    filtro === 'inactivos'
                      ? 'bg-amber-500 text-white'
                      : 'border border-amber-200 bg-white text-amber-700 hover:bg-amber-50',
                  ].join(' ')}
                >
                  Deshabilitados ({deshabilitados})
                </button>
              </div>
            </div>

            {productosFiltrados.length === 0 ? (
              <p className="mt-8 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                No hay productos que coincidan con el filtro.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {productosFiltrados.map((producto) => {
                  const activo = esProductoActivo(producto)

                  return (
                    <li
                      key={producto.id}
                      className={[
                        'flex flex-wrap items-center gap-3 py-4',
                        activo ? '' : 'opacity-70',
                      ].join(' ')}
                    >
                      <img
                        src={producto.imagen}
                        alt=""
                        className={[
                          'h-16 w-16 shrink-0 rounded-xl object-cover',
                          activo ? '' : 'grayscale',
                        ].join(' ')}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {producto.titulo}
                          </p>
                          <span
                            className={[
                              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                              activo
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700',
                            ].join(' ')}
                          >
                            {activo ? 'Publicado' : 'Deshabilitado'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {obtenerCategoria(producto.categoria).nombre} ·{' '}
                          {formatearPrecio(producto.precio)}
                        </p>
                        <p
                          className={[
                            'mt-0.5 text-xs font-semibold',
                            producto.stock > 0
                              ? 'text-slate-500'
                              : 'text-red-600',
                          ].join(' ')}
                        >
                          {producto.stock > 0
                            ? `${producto.stock} en stock`
                            : 'Sin stock'}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(producto)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(producto)}
                          className={[
                            'rounded-lg border px-3 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-4',
                            activo
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50 focus:ring-amber-100'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-100',
                          ].join(' ')}
                        >
                          {activo ? 'Deshabilitar' : 'Habilitar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(producto)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default Panel
