# AGENTS.md

## Project

Dayshop frontend: a Vite 8 + React 19 single-page app using Tailwind CSS v4.
Entry point is `src/main.jsx` -> `src/App.jsx`. There is no router, state
library, backend client, or test suite yet. `README.md` is the stock Vite
template and does not describe this app.

## Commands

- `npm install` — use npm; `package-lock.json` is the only lockfile.
- `npm run dev` — Vite dev server with HMR.
- `npm run lint` — ESLint flat config, checks `**/*.{js,jsx}` only.
- `npm run build` — production build to `dist/` (gitignored).
- `npm run preview` — serve the production build.

No test runner is configured; verify changes with `npm run lint` and
`npm run build` instead of guessing a test command.

## Styling

- Tailwind v4 is wired through the `@tailwindcss/vite` plugin in
  `vite.config.js`. There is no `tailwind.config.js`; the global import is
  `@import "tailwindcss";` in `src/index.css`.
- `src/App.css` holds component styles and uses nested CSS.
- Imported assets from `src/assets` are bundled; files in `public/` are served
  from the site root (e.g. `/icons.svg`, `/favicon.svg`).

## Gotchas

- JavaScript/JSX only: TypeScript is not configured, and ESLint does not
  typecheck.
- The Git repository root is the parent directory
  `C:\Users\ARDEY\Documents`, which also contains unrelated folders. Running Git
  from this folder sees those files, so stage explicit paths and never
  `git add .` from here.
