# Auditoria Lighthouse

## Como rodar

```bash
npx playwright install chromium   # o Lighthouse usa o Chromium do Playwright
npm run lighthouse                # build + auditoria local
LIGHTHOUSE_URL=https://nft-marketplace-frontend-challenge.vercel.app npm run lighthouse
```

- Páginas: Início (`/`) e Detalhe do NFT (`/nft/nft_001`).
- Perfis: **mobile** (emulação padrão do Lighthouse: Moto G Power, 4G lento,
  CPU 4× mais lenta) e **desktop** (preset `desktop`).
- **3 medições** por página e perfil; os resumos mostram a **mediana**.
- Build de produção com o cenário padrão dos mocks (MSW ligado, como no deploy).
  Mesmas imagens, fontes e funcionalidades do app; nada é desligado para a
  auditoria.
- Configuração versionada em [`lighthouserc.json`](../lighthouserc.json);
  script em [`scripts/lighthouse.mjs`](../scripts/lighthouse.mjs).

| Arquivo                                  | Conteúdo                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| [`RESULTS-deploy.md`](RESULTS-deploy.md) | medianas no deploy da Vercel (HTTPS + CDN) — **resultado de referência** |
| [`RESULTS.md`](RESULTS.md)               | medianas no build local                                                  |
| `reports/<alvo>/<perfil>/`               | relatório HTML e JSON de cada medição                                    |

O servidor local ([`scripts/serve-dist.mjs`](../scripts/serve-dist.mjs))
comprime as respostas (brotli/gzip) e guarda em cache os arquivos com hash,
como a Vercel. O `vite preview` não comprime, e a medição local ficaria pior
que o deploy por um motivo que não existe em produção.

## Resultado (deploy, mediana)

| Página         | Perfil  | Performance | Acessibilidade | Boas práticas | SEO |    LCP |   CLS |    TBT |
| -------------- | ------- | ----------: | -------------: | ------------: | --: | -----: | ----: | -----: |
| Início         | mobile  |      **85** |            100 |           100 | 100 | 2.95 s | 0.016 | 209 ms |
| Detalhe do NFT | mobile  |          90 |            100 |           100 | 100 | 2.90 s | 0.000 | 117 ms |
| Início         | desktop |          99 |            100 |           100 | 100 | 0.71 s | 0.002 |   0 ms |
| Detalhe do NFT | desktop |          99 |            100 |           100 | 100 | 0.71 s | 0.000 |   0 ms |

Todas as metas são atingidas, exceto **Performance do Início no mobile**
(85, meta 90). As três medições do Início mobile deram 83, 85 e 87.

## Evolução

| Momento (deploy, mobile)                    | Início | Detalhe |
| ------------------------------------------- | -----: | ------: |
| Primeira medição                            |     77 |      86 |
| Sem o cookie store do MSW + preload do mock |     75 |      90 |
| `content-visibility` nas seções de baixo    |     80 |      89 |
| Imagens de 400 px com `srcset`              | **85** |  **90** |

A queda de 77 para 75 na segunda linha não veio das otimizações: no mesmo
commit a home ganhou as seções do Figma (promoções, diário, rodapé completo),
e a página ficou bem mais longa. As duas linhas seguintes atacam esse custo.

## O que foi feito

| Mudança                                                                                                                                                                                                                               | Efeito medido                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `meta description` e `robots.txt` (antes o `/robots.txt` caía no rewrite da SPA e devolvia HTML)                                                                                                                                      | SEO 83 → 100                                              |
| Imagens da primeira linha do catálogo sem `loading="lazy"` e com `fetchpriority="high"` (eram o LCP e estavam adiadas)                                                                                                                | LCP mobile 5,4 s → 3,8 s (local)                          |
| Altura mínima da área de conteúdo: o rodapé não aparece logo abaixo do cabeçalho para depois ser empurrado                                                                                                                            | CLS do Detalhe desktop 0,118 → 0                          |
| No build, o `cookieStore` do MSW é trocado por uma versão vazia ([`src/mocks/msw-cookie-store.ts`](../src/mocks/msw-cookie-store.ts)). O original trazia `tough-cookie` e a lista de domínios do `tldts`, e o mock nunca cria cookies | bundle do mock 176 KB → 51 KB (gzip)                      |
| `<link rel="modulepreload">` do bundle do mock no HTML (plugin no `vite.config.ts`): baixa junto com o app em vez de depois                                                                                                           | uma ida e volta de rede a menos antes da primeira tela    |
| `content-visibility: auto` nas promoções, no diário e no rodapé: o navegador só calcula estilo e layout dessas partes quando chegam perto da tela                                                                                     | TBT do Início mobile 600 → 400 ms                         |
| Versões de 400 px das artes (geradas por [`scripts/resize-images.mjs`](../scripts/resize-images.mjs) com o Chromium do Playwright) servidas com `srcset`                                                                              | ~52 KB → ~15 KB por imagem pequena; Início mobile 80 → 85 |
| Servidor local com compressão, como a Vercel                                                                                                                                                                                          | medição local comparável ao deploy                        |

**Testado e desfeito:** renderizar o app **antes** de o MSW subir (as chamadas
à API esperariam o mock). A tela aparecia antes, mas a execução do bundle do
mock passou a cair dentro da janela do TBT: a mediana do TBT do Início mobile
subiu de ~140 ms para ~1,3 s e a Performance caiu de 79 para 54. Voltei ao
comportamento anterior (commit 171d209).

## Por que o Início mobile ainda fica abaixo de 90

Relatório mediano do Início no deploy: FCP 2,7 s, LCP 2,9 s, TBT 209 ms.

1. **Trabalho de CPU antes da primeira tela.** Na simulação (CPU 4× mais
   lenta), executar o JavaScript leva ~1,1 s: o bundle do mock (MSW, handlers,
   banco em memória, servidor Socket.IO simulado) e o app (React, TanStack,
   `zod`, `decimal.js`). A tela só aparece depois de o mock subir, porque toda
   chamada da página depende dele. Num backend real, o mock não existiria no
   cliente.
2. **O LCP depende de dados.** O maior elemento é a imagem do primeiro card,
   que só é descoberta quando a lista chega da API simulada.
3. **O Detalhe chega a 90 e o Início não** porque a home tem mais conteúdo
   na primeira renderização (hero, filtros, 9 cards).

Próximo passo possível, não feito: trocar o `zod` pela versão `zod/mini`
(~27 KB gzip a menos no bundle principal). Exigiria reescrever as 12 validações
do app e do mock, com risco de mudar mensagens de erro, para um ganho estimado
de poucos pontos.

## Diferença entre local e deploy

Na máquina onde as medições locais foram feitas, o antivírus (Kaspersky)
injeta um script `http://gc.kis.v2.scr.kaspersky-labs.com/...` no HTML de
páginas servidas por HTTP. A configuração bloqueia essa URL
(`blockedUrlPatterns`), mas a auditoria "is-on-https" ainda conta a tentativa,
e por isso **Boas práticas** dá ~82 no local e **100 no deploy**. Não é algo
do app. O local também é mais lento em FCP e LCP que o deploy (servidor Node
sem CDN, mais o script do antivírus), então as notas de Performance locais
ficam alguns pontos abaixo.
