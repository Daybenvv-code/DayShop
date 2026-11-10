import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apiHandler } from './app.js'

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = resolve(CURRENT_DIR, '..', 'dist')
const PORT = Number(process.env.PORT || 3001)

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendFile(req, res, filePath) {
  const contentType =
    MIME_TYPES[extname(filePath).toLowerCase()] ??
    'application/octet-stream'

  res.statusCode = 200
  res.setHeader('Content-Type', contentType)
  res.setHeader('Cache-Control', 'no-cache')

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  createReadStream(filePath)
    .on('error', () => {
      if (!res.headersSent) res.statusCode = 500
      res.end()
    })
    .pipe(res)
}

async function resolveStaticFile(pathname) {
  const candidate = resolve(DIST_DIR, `.${pathname}`)

  if (candidate !== DIST_DIR && !candidate.startsWith(DIST_DIR + sep)) {
    return null
  }

  try {
    const info = await stat(candidate)
    if (info.isFile()) return candidate
  } catch {
    return null
  }

  return null
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false

  const filePath = await resolveStaticFile(pathname)
  if (filePath) {
    sendFile(req, res, filePath)
    return true
  }

  const indexPath = join(DIST_DIR, 'index.html')

  try {
    const info = await stat(indexPath)
    if (info.isFile()) {
      sendFile(req, res, indexPath)
      return true
    }
  } catch {
    return false
  }

  return false
}

const server = createServer((req, res) => {
  const url = new URL(
    req.url,
    `http://${req.headers.host || `localhost:${PORT}`}`,
  )

  if (url.pathname.startsWith('/api/')) {
    apiHandler(req, res)
    return
  }

  serveStatic(req, res, url.pathname)
    .then((served) => {
      if (served) return
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('No encontrado')
    })
    .catch(() => {
      if (res.headersSent) return
      res.statusCode = 500
      res.end('Error interno')
    })
})

server.listen(PORT, () => {
  console.log(`DayShop disponible en http://localhost:${PORT}`)
})
