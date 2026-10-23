import { useState } from 'react'
import Registro from './page/Registro.jsx'

function App() {
  const [session, setSession] = useState(null)

  if (session) {
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
            Sesión iniciada
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tu cuenta fue creada correctamente. Bienvenido,{' '}
            <span className="font-semibold text-slate-900">
              {session.nombreCompleto}
            </span>
            .
          </p>
          <p className="mt-1 text-xs text-slate-500">{session.email}</p>
          <button
            type="button"
            onClick={() => setSession(null)}
            className="mt-7 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            Cerrar sesión
          </button>
        </section>
      </main>
    )
  }

  return <Registro onRegistered={setSession} />
}

export default App
