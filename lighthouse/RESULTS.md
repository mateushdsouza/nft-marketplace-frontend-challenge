# Resultados do Lighthouse

Gerado em 2026-11-26 por `npm run lighthouse`.
Mediana de 3 medições por página e perfil, sobre o build de produção
com o cenário padrão dos mocks.

- Alvo: build local servido por `scripts/serve-dist.mjs` (gzip/brotli e cache, como a Vercel)

- Lighthouse 12.6.1 (via @lhci/cli)
- Navegador: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/159.0.0.0 Safari/537.36
- Node v24.19.0, win32
- Mobile: emulação padrão do Lighthouse (Moto G Power, 4G lento, CPU 4×)
- Desktop: preset `desktop` do Lighthouse (sem limitação de CPU, rede rápida)

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Início | mobile | **79** ⚠ | 100 | **82** ⚠ | 100 | 3.84 s | 0.016 | 151 ms |
| Detalhe do NFT | mobile | **83** ⚠ | 100 | **82** ⚠ | 100 | 3.51 s | 0.000 | 148 ms |
| Início | desktop | 93 | 100 | **81** ⚠ | 100 | 1.31 s | 0.002 | 0 ms |
| Detalhe do NFT | desktop | 97 | 100 | **81** ⚠ | 100 | 1.03 s | 0.000 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.
Valores abaixo da meta aparecem com ⚠. Os relatórios completos (HTML e JSON)
de cada medição estão em `lighthouse/reports/local/<perfil>/`.
