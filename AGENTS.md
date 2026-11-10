# AGENTS.md

## Proyecto

Dayshop frontend: una aplicación de página única (SPA) hecha con Vite 8 + React 19 y
Tailwind CSS v4. Vive en `Dayshop-frontend/`. El punto de entrada es
`Dayshop-frontend/src/main.jsx` -> `Dayshop-frontend/src/App.jsx`. No hay router ni
librería de estado. Una API Node sin dependencias vive en `Dayshop-frontend/server/` y se
monta en los servidores de desarrollo y preview de Vite mediante
`Dayshop-frontend/vite.config.js`. `Dayshop-frontend/README.md` es la plantilla estándar de
Vite y no describe esta aplicación.

## Comandos

Ejecuta los comandos dentro de `Dayshop-frontend/`. Desde la raíz del repositorio también
puedes usar `npm test`, `npm run lint` y `npm run build`, que delegan en esa carpeta.

- `npm install` — usa npm; `package-lock.json` es el único lockfile.
- `npm run dev` — servidor de desarrollo de Vite con HMR.
- `npm run lint` — ESLint con configuración flat; revisa solo `**/*.{js,jsx}`.
- `npm test` — ejecuta las pruebas con Vitest (`src/utils/*.test.js` y `server/*.test.js`).
- `npm run build` — build de producción en `dist/` (ignorado por Git).
- `npm run preview` — sirve el build de producción (incluye la API).
- `npm start` — servidor Node independiente para la API y `dist/` (ejecuta `npm run build` antes).

Verifica los cambios con `npm run lint`, `npm test` y `npm run build`.

## Diseño centrado en las personas

Antes de crear o modificar pantallas, lee las personas y sus necesidades en
`Dayshop-frontend/src/Personas.md` y diseña pensando en ellas:

- **Carlos Mendoza (cliente / comprador frecuente):** prioriza rapidez (catálogo en menos de
  2 segundos), pocos pasos para comprar, carrito dinámico sin recargar, buscador intuitivo,
  claridad total en estados/tiempos de entrega y costos de envío, y una interfaz responsive
  para móvil y laptop.
- **Sofía Vargas (administradora / gestora del negocio):** prioriza un panel ordenado y rápido
  para actualizar stock, precios y productos, monitorear pedidos y mantener la plataforma
  segura y funcional.

Cada cambio de UI debe justificarse en al menos una de esas necesidades (por ejemplo: menos
clics, menos espera, información más clara o gestión más ágil).

## Estilos

- Tailwind v4 se integra mediante el plugin `@tailwindcss/vite` en
  `Dayshop-frontend/vite.config.js`. No hay `tailwind.config.js`; el import global es
  `@import "tailwindcss";` en `Dayshop-frontend/src/index.css`.
- `Dayshop-frontend/src/App.css` contiene estilos de componentes y usa CSS anidado.
- Los assets importados desde `Dayshop-frontend/src/assets` se empaquetan; los archivos de
  `Dayshop-frontend/public/` se sirven desde la raíz del sitio (por ejemplo, `/icons.svg`,
  `/favicon.svg`).

## Advertencias

- Solo JavaScript/JSX: TypeScript no está configurado y ESLint no verifica tipos.
- Las cuentas de usuario se guardan en `Dayshop-frontend/server/data/users.json`, el catálogo
  en `Dayshop-frontend/server/data/productos.json` y las direcciones de envío por usuario en
  `Dayshop-frontend/server/data/direcciones.json` (todos ignorados por Git). La validación
  compartida de usuarios vive en `Dayshop-frontend/shared/validation.js`; los datos,
  normalización y validación del catálogo en `Dayshop-frontend/shared/catalog.js`; la
  validación de direcciones y los mensajes de envío en
  `Dayshop-frontend/shared/direcciones.js` y `Dayshop-frontend/shared/mensajes.js`, y se
  ejecutan tanto en cliente como en servidor.
- La raíz del repositorio Git es este directorio (`C:\Users\ARDEY\Documents\DayShop`), no la
  carpeta padre. Hay archivos de dependencias en la raíz, así que agrega rutas explícitas y
  nunca uses `git add .` desde aquí.
