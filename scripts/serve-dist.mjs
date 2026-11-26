// Servidor estático do build (dist/) para a auditoria Lighthouse.
// O `vite preview` não comprime as respostas; a Vercel comprime (brotli/gzip)
// e guarda em cache os arquivos com hash. Este servidor faz o mesmo, para a
// medição local refletir o deploy. Só módulos do Node, sem dependências.
//
// Uso: node scripts/serve-dist.mjs [porta]

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { createBrotliCompress, createGzip } from 'node:zlib'

const ROOT = resolve('dist')
const PORT = Number(process.argv[2] ?? 4174)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt'])

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '')
  const file = join(ROOT, clean)
  // Nada fora de dist/.
  if (!file.startsWith(ROOT)) return null
  if (existsSync(file) && statSync(file).isFile()) return file
  // Rota da SPA (ex.: /nft/nft_001): devolve o index.html, como o rewrite
  // do vercel.json. Arquivo com extensão que não existe é 404 de verdade.
  return extname(clean) ? null : join(ROOT, 'index.html')
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const file = resolveFile(url.pathname)
  if (!file) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Não encontrado')
    return
  }

  const ext = extname(file)
  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    // Arquivos em /assets têm hash no nome: podem ficar em cache para sempre.
    'Cache-Control': url.pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
    Vary: 'Accept-Encoding',
  }

  const accept = String(request.headers['accept-encoding'] ?? '')
  let stream = createReadStream(file)
  if (COMPRESSIBLE.has(ext) && accept.includes('br')) {
    headers['Content-Encoding'] = 'br'
    stream = stream.pipe(createBrotliCompress())
  } else if (COMPRESSIBLE.has(ext) && accept.includes('gzip')) {
    headers['Content-Encoding'] = 'gzip'
    stream = stream.pipe(createGzip())
  }

  response.writeHead(200, headers)
  stream.pipe(response)
}).listen(PORT, () => {
  console.log(`Servindo dist/ em http://localhost:${PORT}`)
})
