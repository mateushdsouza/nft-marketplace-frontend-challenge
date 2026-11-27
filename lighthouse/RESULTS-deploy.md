# Resultados do Lighthouse

Gerado em 2026-11-27 por `npm run lighthouse`.
Mediana de 3 medições por página e perfil, sobre o build de produção
com o cenário padrão dos mocks.

- Alvo: deploy publicado em https://nft-marketplace-frontend-challenge.vercel.app (HTTPS, CDN da Vercel)

- Lighthouse 12.6.1 (via @lhci/cli)
- Navegador: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/159.0.0.0 Safari/537.36
- Node v24.19.0, win32
- Mobile: emulação padrão do Lighthouse (Moto G Power, 4G lento, CPU 4×)
- Desktop: preset `desktop` do Lighthouse (sem limitação de CPU, rede rápida)

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Início | mobile | **85** ⚠ | 100 | 100 | 100 | 2.95 s | 0.016 | 209 ms |
| Detalhe do NFT | mobile | 90 | 100 | 100 | 100 | 2.90 s | 0.000 | 117 ms |
| Início | desktop | 99 | 100 | 100 | 100 | 0.71 s | 0.002 | 0 ms |
| Detalhe do NFT | desktop | 99 | 100 | 100 | 100 | 0.71 s | 0.000 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.
Valores abaixo da meta aparecem com ⚠. Os relatórios completos (HTML e JSON)
de cada medição estão em `lighthouse/reports/deploy/<perfil>/`.
