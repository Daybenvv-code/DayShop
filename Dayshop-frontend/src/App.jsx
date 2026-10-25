import { useEffect, useState } from 'react'
import { useCantidadCarrito } from './data/carrito.js'
import { obtenerEstadoPedido } from './data/estadosPedido.js'
import { useOrdenes } from './data/ordenes.js'
import { formatearPrecio } from './data/productos.js'
import {
  asegurarAdministrador,
  esAdministrador,
  normalizarRol,
} from './data/usuarios.js'
import Login from './page/Login.jsx'
import Registro from './page/Registro.jsx'
import Panel from './page/Panel/Panel.jsx'
import Catalogo from './page/Catalogo/Catalogo.jsx'
import ProductoDetalle from './page/Catalogo/ProductoDetalle.jsx'
import Buscador from './page/Buscador/Buscador.jsx'
import Carrito from './page/Carrito/Carrito.jsx'
import RegistroEnvio from './page/RegistroEnvio/RegistroEnvio.jsx'
import Procesamiento from './page/Procesamient0/Procesamiento.jsx'
import Seguimiento from './page/Seguiente/Seguimiento.jsx'
import Historial from './page/Historial/Historial.jsx'

function MiCuenta({
  session,
  esAdmin,
  onLogout,
  onOpenAdmin,
  onOpenCatalogo,
  onOpenBuscador,
  onOpenCarrito,
  onOpenEnvio,
  onOpenSeguimiento,
  onOpenHistorial,
}) {
  const cantidadCarrito = useCantidadCarrito()
  const ordenes = useOrdenes()
  const userId = session?.id ?? session?.email ?? 'invitado'
  const misOrdenes = ordenes.filter((orden) => orden.userId === userId)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 text-center shadow-2xl shadow-slate-950/40 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
          ✓
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
          DayShop
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Mi cuenta / Mis compras
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Bienvenido,{' '}
          <span className="font-semibold text-slate-900">{session.nombreCompleto}</span>. Ya
          puedes gestionar tus compras.
        </p>
        <p className="mt-1 text-xs text-slate-500">{session.email}</p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          {misOrdenes.length === 0 ? (
            'Todavía no tienes compras registradas.'
          ) : (
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Tus últimas compras
                </h2>
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                  {misOrdenes.length}
                </span>
              </div>

              {misOrdenes.slice(0, 3).map((orden) => (
                <div
                  key={orden.numero}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-bold text-indigo-600">
                      {orden.numero}
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      {formatearPrecio(orden.total)}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      {new Date(orden.creadaEn).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      ·{' '}
                      {orden.items.reduce(
                        (total, item) => total + item.cantidad,
                        0,
                      )}{' '}
                      unidades
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      {obtenerEstadoPedido(orden.estado).titulo}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenHistorial(orden.numero)}
                      className="text-xs font-bold text-indigo-600 transition hover:text-indigo-800"
                    >
                      Ver detalle →
                    </button>
                    {orden.estado !== 'cancelado' ? (
                      <button
                        type="button"
                        onClick={() => onOpenSeguimiento(orden.numero)}
                        className="text-xs font-bold text-slate-500 transition hover:text-indigo-600"
                      >
                        Seguimiento →
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {misOrdenes.length > 3 ? (
                <p className="text-xs font-semibold text-slate-500">
                  +{misOrdenes.length - 3} compras anteriores
                </p>
              ) : null}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenCatalogo}
          className="mt-7 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
        >
          Ver catálogo
        </button>
        <button
          type="button"
          onClick={onOpenBuscador}
          className="mt-3 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          Buscar productos
        </button>
        <button
          type="button"
          onClick={onOpenCarrito}
          className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          Ver carrito ({cantidadCarrito})
        </button>
        <button
          type="button"
          onClick={onOpenEnvio}
          className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          Direcciones de envío
        </button>
        <button
          type="button"
          onClick={() => onOpenHistorial()}
          className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          Historial de pedidos
        </button>
        {esAdmin ? (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            Panel de administración
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
        >
          Cerrar sesión
        </button>
      </section>
    </main>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [screen, setScreen] = useState('login')
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [envioVolverA, setEnvioVolverA] = useState('carrito')
  const [envioSeleccionado, setEnvioSeleccionado] = useState(null)
  const [selectedOrderNumber, setSelectedOrderNumber] = useState(null)
  const esAdmin = esAdministrador(session)

  useEffect(() => {
    asegurarAdministrador()
  }, [])

  function handleAuthenticated(user) {
    setSession({ ...user, rol: normalizarRol(user?.rol) })
    setScreen('cuenta')
    setSelectedProductId(null)
    setEnvioSeleccionado(null)
    setSelectedOrderNumber(null)
  }

  function handleLogout() {
    setSession(null)
    setScreen('login')
    setSelectedProductId(null)
    setEnvioSeleccionado(null)
    setSelectedOrderNumber(null)
  }

  function openCatalogo() {
    setSelectedProductId(null)
    setScreen('catalogo')
  }

  function openBuscador() {
    setSelectedProductId(null)
    setScreen('buscador')
  }

  function openCarrito() {
    setSelectedProductId(null)
    setScreen('carrito')
  }

  function openEnvio(origen = 'carrito') {
    setSelectedProductId(null)
    setEnvioVolverA(origen)
    setScreen('envio')
  }

  function openProcesamiento(direccion) {
    setSelectedProductId(null)
    setEnvioSeleccionado(direccion)
    setScreen('procesamiento')
  }

  function openSeguimiento(numero = null) {
    setSelectedProductId(null)
    setSelectedOrderNumber(numero)
    setScreen('seguimiento')
  }

  function openHistorial(numero = null) {
    setSelectedProductId(null)
    setSelectedOrderNumber(numero)
    setScreen('historial')
  }

  if (session) {
    if (screen === 'catalogo') {
      if (selectedProductId) {
        return (
          <ProductoDetalle
            productoId={selectedProductId}
            onBack={() => setSelectedProductId(null)}
          />
        )
      }

      return (
        <Catalogo
          esAdmin={esAdmin}
          onBack={() => setScreen('cuenta')}
          onOpenAdmin={() => setScreen('admin')}
          onOpenBuscador={openBuscador}
          onOpenCarrito={openCarrito}
          onSelectProduct={setSelectedProductId}
        />
      )
    }

    if (screen === 'buscador') {
      return (
        <Buscador
          onBack={() => setScreen('cuenta')}
          onOpenCatalogo={openCatalogo}
          onOpenCarrito={openCarrito}
        />
      )
    }

    if (screen === 'carrito') {
      return (
        <Carrito
          onBack={() => setScreen('cuenta')}
          onOpenCatalogo={openCatalogo}
          onOpenBuscador={openBuscador}
          onOpenEnvio={() => openEnvio('carrito')}
        />
      )
    }

    if (screen === 'envio') {
      return (
        <RegistroEnvio
          session={session}
          onBack={() => setScreen(envioVolverA)}
          onOpenCarrito={openCarrito}
          onContinueToPayment={openProcesamiento}
        />
      )
    }

    if (screen === 'procesamiento') {
      return (
        <Procesamiento
          session={session}
          envio={envioSeleccionado}
          onBack={() => setScreen('envio')}
          onOpenCarrito={openCarrito}
          onOpenCatalogo={openCatalogo}
          onOpenCuenta={() => setScreen('cuenta')}
          onOpenSeguimiento={openSeguimiento}
        />
      )
    }

    if (screen === 'seguimiento') {
      return (
        <Seguimiento
          session={session}
          numeroOrden={selectedOrderNumber}
          onBack={() => setScreen('cuenta')}
          onOpenCatalogo={openCatalogo}
          onOpenCarrito={openCarrito}
          onSelectOrder={setSelectedOrderNumber}
        />
      )
    }

    if (screen === 'historial') {
      return (
        <Historial
          session={session}
          numeroInicial={selectedOrderNumber}
          onBack={() => setScreen('cuenta')}
          onOpenCatalogo={openCatalogo}
          onOpenCarrito={openCarrito}
          onOpenSeguimiento={openSeguimiento}
        />
      )
    }

    if (screen === 'admin') {
      return <Panel session={session} onBack={openCatalogo} />
    }

    return (
      <MiCuenta
        session={session}
        esAdmin={esAdmin}
        onLogout={handleLogout}
        onOpenAdmin={() => setScreen('admin')}
        onOpenCatalogo={openCatalogo}
        onOpenBuscador={openBuscador}
        onOpenCarrito={openCarrito}
        onOpenEnvio={() => openEnvio('cuenta')}
        onOpenSeguimiento={openSeguimiento}
        onOpenHistorial={openHistorial}
      />
    )
  }

  if (screen === 'registro') {
    return (
      <Registro
        onRegistered={handleAuthenticated}
        onGoToLogin={() => setScreen('login')}
      />
    )
  }

  return (
    <Login
      onLoggedIn={handleAuthenticated}
      onGoToRegister={() => setScreen('registro')}
    />
  )
}

export default App
