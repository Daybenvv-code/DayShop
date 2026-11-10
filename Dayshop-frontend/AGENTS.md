# AGENTS.md

## Proyecto

Dayshop frontend: una aplicación de página única (SPA) hecha con Vite 8 + React 19 y
Tailwind CSS v4. El punto de entrada es `src/main.jsx` -> `src/App.jsx`. No hay router ni
librería de estado. Una API Node sin dependencias vive en `server/` y se monta en los
servidores de desarrollo y preview de Vite mediante `vite.config.js`. `README.md` es la
plantilla estándar de Vite y no describe esta aplicación.

## Comandos

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
`src/FichaUser.md` y diseña pensando en ellas:

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

- Tailwind v4 se integra mediante el plugin `@tailwindcss/vite` en `vite.config.js`. No hay
  `tailwind.config.js`; el import global es `@import "tailwindcss";` en `src/index.css`.
- `src/App.css` contiene estilos de componentes y usa CSS anidado.
- Los assets importados desde `src/assets` se empaquetan; los archivos de `public/` se sirven
  desde la raíz del sitio (por ejemplo, `/icons.svg`, `/favicon.svg`).

## Advertencias

- Solo JavaScript/JSX: TypeScript no está configurado y ESLint no verifica tipos.
- Las cuentas de usuario se guardan en `server/data/users.json`, el catálogo en
  `server/data/productos.json` y las direcciones de envío por usuario en
  `server/data/direcciones.json` (todos ignorados por Git). La validación compartida de
  usuarios vive en `shared/validation.js`; los datos, normalización y validación del catálogo
  en `shared/catalog.js`; la validación de direcciones y los mensajes de envío en
  `shared/direcciones.js` y `shared/mensajes.js`, y se ejecutan tanto en cliente como en
  servidor.
- La raíz real del repositorio Git es el directorio padre
  `C:\Users\ARDEY\Documents`, que también contiene carpetas no relacionadas. Al ejecutar Git
  desde esta carpeta se ven esos archivos, así que agrega rutas explícitas y nunca uses
  `git add .` desde aquí.
