import { obtenerCiudad } from '../../data/envios.js'
import { obtenerEstadoPedido } from '../../data/estadosPedido.js'
import { formatearPrecio } from '../../data/productos.js'

function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caracter) => {
    const reemplazos = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return reemplazos[caracter]
  })
}

function formatearFechaHora(valor) {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return 'Sin registro'

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(fecha)
}

function ciudadTexto(orden) {
  const ciudad = orden.direccion?.ciudad
    ? obtenerCiudad(orden.direccion.ciudad)
    : null

  return ciudad
    ? `${ciudad.nombre} (${ciudad.departamento})`
    : orden.direccion?.ciudad ?? 'No registrada'
}

export function generarReciboHtml(orden, cliente = {}) {
  const estado = obtenerEstadoPedido(orden.estado)
  const filas = orden.items
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escaparHtml(item.titulo)}</strong>
            <span>${escaparHtml(item.productoId)}</span>
          </td>
          <td class="centro">${escaparHtml(item.cantidad)}</td>
          <td class="derecha">${escaparHtml(formatearPrecio(item.precio))}</td>
          <td class="derecha">${escaparHtml(formatearPrecio(item.subtotal))}</td>
        </tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Boleta ${escaparHtml(orden.numero)} - DayShop Delivery</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px 16px; background: #f1f5f9; color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
    .recibo { width: min(760px, 100%); margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12); }
    .cabecera { padding: 28px 30px; background: #020617; color: #ffffff; display: flex; justify-content: space-between; gap: 24px; }
    .marca { display: flex; align-items: center; gap: 12px; }
    .logo { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 14px; background: #4f46e5; font-size: 20px; font-weight: 900; }
    .marca h1 { margin: 0; font-size: 22px; }
    .marca p { margin: 3px 0 0; color: #a5b4fc; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; }
    .codigo { text-align: right; }
    .codigo p { margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
    .codigo strong { display: block; margin-top: 5px; font-size: 18px; font-family: Consolas, monospace; }
    .cuerpo { padding: 28px 30px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 26px; }
    .bloque { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
    .bloque h2 { margin: 0 0 8px; color: #64748b; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; }
    .bloque p { margin: 3px 0; font-size: 13px; line-height: 1.5; }
    .estado { display: inline-block; margin-top: 5px; padding: 4px 10px; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 10px 8px; border-bottom: 2px solid #cbd5e1; color: #64748b; font-size: 10px; letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
    td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; vertical-align: top; }
    td strong { display: block; font-size: 13px; }
    td span { display: block; margin-top: 3px; color: #94a3b8; font-size: 10px; }
    .centro { text-align: center; }
    .derecha { text-align: right; white-space: nowrap; }
    .totales { width: min(320px, 100%); margin: 22px 0 0 auto; }
    .totales div { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; font-size: 13px; }
    .totales .total { margin-top: 5px; padding-top: 12px; border-top: 2px solid #cbd5e1; font-size: 18px; font-weight: 900; color: #4f46e5; }
    .pie { margin-top: 28px; padding-top: 18px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px; line-height: 1.6; }
    @media print { body { padding: 0; background: #ffffff; } .recibo { border: 0; box-shadow: none; } }
    @media (max-width: 560px) { .cabecera { flex-direction: column; } .codigo { text-align: left; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main class="recibo">
    <header class="cabecera">
      <div class="marca">
        <div class="logo">D</div>
        <div>
          <h1>DayShop Delivery</h1>
          <p>Recibo digital</p>
        </div>
      </div>
      <div class="codigo">
        <p>Código de orden</p>
        <strong>${escaparHtml(orden.numero)}</strong>
      </div>
    </header>

    <section class="cuerpo">
      <div class="grid">
        <div class="bloque">
          <h2>Cliente</h2>
          <p><strong>${escaparHtml(cliente.nombreCompleto ?? 'Cliente DayShop')}</strong></p>
          <p>${escaparHtml(cliente.email ?? 'Sin correo registrado')}</p>
          <p>${escaparHtml(formatearFechaHora(orden.creadaEn))}</p>
        </div>
        <div class="bloque">
          <h2>Entrega</h2>
          <p>${escaparHtml(orden.direccion?.direccion ?? 'Sin dirección registrada')}</p>
          <p>${escaparHtml(orden.direccion?.referencia ?? '')}</p>
          <p>${escaparHtml(ciudadTexto(orden))}</p>
          <span class="estado">${escaparHtml(estado.titulo)}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th class="centro">Cant.</th>
            <th class="derecha">Precio</th>
            <th class="derecha">Subtotal</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>

      <div class="totales">
        <div><span>Subtotal</span><strong>${escaparHtml(formatearPrecio(orden.subtotal))}</strong></div>
        <div><span>Envío</span><strong>${escaparHtml(formatearPrecio(orden.costoEnvio))}</strong></div>
        <div class="total"><span>Total pagado</span><strong>${escaparHtml(formatearPrecio(orden.total))}</strong></div>
      </div>

      <p class="pie">
        Documento generado digitalmente por DayShop Delivery. Conserva este recibo como comprobante de tu compra.
        Fecha de emisión: ${escaparHtml(formatearFechaHora(new Date().toISOString()))}.
      </p>
    </section>
  </main>
</body>
</html>`
}

export function descargarRecibo(orden, cliente = {}) {
  const html = generarReciboHtml(orden, cliente)
  const archivo = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')

  enlace.href = url
  enlace.download = `boleta-${orden.numero}.html`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
