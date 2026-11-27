# Resultados do Lighthouse

Gerado em 2026-11-27 por `npm run lighthouse`.
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
| Início | mobile | **80** ⚠ | 100 | **82** ⚠ | 100 | 3.88 s | 0.017 | 185 ms |
| Detalhe do NFT | mobile | **82** ⚠ | 100 | **82** ⚠ | 100 | 3.49 s | 0.000 | 220 ms |
| Início | desktop | 96 | 100 | **81** ⚠ | 100 | 1.17 s | 0.001 | 0 ms |
| Detalhe do NFT | desktop | 98 | 100 | **81** ⚠ | 100 | 1.00 s | 0.000 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.
Valores abaixo da meta aparecem com ⚠. Os relatórios completos (HTML e JSON)
de cada medição estão em `lighthouse/reports/local/<perfil>/`.
