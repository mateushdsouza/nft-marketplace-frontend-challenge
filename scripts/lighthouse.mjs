// Auditoria Lighthouse: Início e Detalhe, perfis mobile e desktop,
// 3 medições cada, sobre o build de produção com o cenário padrão dos mocks.
// Gera os relatórios HTML/JSON em lighthouse/reports/<alvo>/<perfil>/ e o
// resumo com as medianas em lighthouse/RESULTS.md (ou RESULTS-deploy.md).
//
// Uso:
//   npm run lighthouse                         build local, servido com compressão
//   LIGHTHOUSE_URL=https://... npm run lighthouse   audita um deploy publicado

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const PROFILES = ['mobile', 'desktop']
const DEPLOY_URL = process.env.LIGHTHOUSE_URL?.replace(/\/$/, '')
const TARGET = DEPLOY_URL ? 'deploy' : 'local'
const REPORTS = join('lighthouse/reports', TARGET)
const RESULTS = DEPLOY_URL
  ? 'lighthouse/RESULTS-deploy.md'
  : 'lighthouse/RESULTS.md'
const CATEGORIES = [
  ['performance', 'Performance', 90],
  ['accessibility', 'Acessibilidade', 95],
  ['best-practices', 'Boas práticas', 95],
  ['seo', 'SEO', 90],
]
const PAGES = { '/': 'Início', '/nft/nft_001': 'Detalhe do NFT' }

// Usa o Chromium do Playwright, que o projeto já instala para os testes.
// Assim a auditoria não depende de um Chrome instalado na máquina.
if (!process.env.CHROME_PATH)
  process.env.CHROME_PATH = chromium.executablePath()

function run(command) {
  execSync(command, { stdio: 'inherit', env: process.env })
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

// Para o deploy: mesma configuração, sem subir servidor local.
let config = 'lighthouserc.json'
if (DEPLOY_URL) {
  const base = JSON.parse(readFileSync('lighthouserc.json', 'utf8'))
  delete base.ci.collect.startServerCommand
  delete base.ci.collect.startServerReadyPattern
  base.ci.collect.url = Object.keys(PAGES).map((path) => DEPLOY_URL + path)
  config = 'lighthouse/.lighthouserc.deploy.json'
  writeFileSync(config, JSON.stringify(base, null, 2))
}

for (const profile of PROFILES) {
  const outputDir = join(REPORTS, profile)
  rmSync('.lighthouseci', { recursive: true, force: true })
  rmSync(outputDir, { recursive: true, force: true })
  const preset = profile === 'desktop' ? ' --settings.preset=desktop' : ''
  run(`npx lhci collect --config=${config}${preset}`)
  run(`npx lhci assert --config=${config} || exit 0`)
  run(`npx lhci upload --target=filesystem --outputDir=${outputDir}`)
}
rmSync('.lighthouseci', { recursive: true, force: true })
if (DEPLOY_URL) rmSync(config, { force: true })

// Resumo: mediana de cada categoria e das métricas por página e perfil.
const rows = []
let lighthouseVersion = ''
let userAgent = ''
for (const profile of PROFILES) {
  const manifestPath = join(REPORTS, profile, 'manifest.json')
  if (!existsSync(manifestPath)) continue
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  for (const [path, label] of Object.entries(PAGES)) {
    const runs = manifest
      .filter((entry) => new URL(entry.url).pathname === path)
      .map((entry) => JSON.parse(readFileSync(entry.jsonPath, 'utf8')))
    if (runs.length === 0) continue
    lighthouseVersion = runs[0].lighthouseVersion
    userAgent = runs[0].environment.hostUserAgent
    const score = (key) =>
      median(runs.map((r) => Math.round(r.categories[key].score * 100)))
    const metric = (id) => median(runs.map((r) => r.audits[id].numericValue))
    rows.push({
      label,
      profile,
      runs: runs.length,
      scores: CATEGORIES.map(([key]) => score(key)),
      lcp: metric('largest-contentful-paint'),
      cls: metric('cumulative-layout-shift'),
      tbt: metric('total-blocking-time'),
    })
  }
}

const mark = (value, target) =>
  value >= target ? `${value}` : `**${value}** ⚠`
const lines = [
  '# Resultados do Lighthouse',
  '',
  `Gerado em ${new Date().toISOString().slice(0, 10)} por \`npm run lighthouse\`.`,
  'Mediana de 3 medições por página e perfil, sobre o build de produção',
  'com o cenário padrão dos mocks.',
  '',
  DEPLOY_URL
    ? `- Alvo: deploy publicado em ${DEPLOY_URL} (HTTPS, CDN da Vercel)`
    : '- Alvo: build local servido por `scripts/serve-dist.mjs` (gzip/brotli e cache, como a Vercel)',
  '',
  `- Lighthouse ${lighthouseVersion} (via @lhci/cli)`,
  `- Navegador: ${userAgent}`,
  `- Node ${process.version}, ${process.platform}`,
  '- Mobile: emulação padrão do Lighthouse (Moto G Power, 4G lento, CPU 4×)',
  '- Desktop: preset `desktop` do Lighthouse (sem limitação de CPU, rede rápida)',
  '',
  '| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|',
  ...rows.map(
    (r) =>
      `| ${r.label} | ${r.profile} | ${r.scores
        .map((s, i) => mark(s, CATEGORIES[i][2]))
        .join(
          ' | ',
        )} | ${(r.lcp / 1000).toFixed(2)} s | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} ms |`,
  ),
  '',
  'Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.',
  'Valores abaixo da meta aparecem com ⚠. Os relatórios completos (HTML e JSON)',
  `de cada medição estão em \`${REPORTS}/<perfil>/\`.`,
  '',
]
writeFileSync(RESULTS, lines.join('\n'))
console.log(lines.join('\n'))
