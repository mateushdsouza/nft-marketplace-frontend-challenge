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
| Início         | mobile  |      **77** |            100 |           100 | 100 | 3.23 s | 0.036 | 431 ms |
| Detalhe do NFT | mobile  |      **86** |            100 |           100 | 100 | 3.22 s | 0.000 | 150 ms |
| Início         | desktop |          99 |            100 |           100 | 100 | 0.76 s | 0.002 |   0 ms |
| Detalhe do NFT | desktop |          99 |            100 |           100 | 100 | 0.76 s | 0.000 |   0 ms |

Todas as metas são atingidas, exceto **Performance no mobile** (meta 90).

## Por que a Performance mobile fica abaixo de 90

Números do relatório mediano do Início no deploy: FCP 2,8 s, LCP 3,2 s,
TBT 430 ms.

1. **O backend simulado roda no navegador.** Antes da primeira renderização, o
   app baixa e executa o bundle do MSW (handlers, fixtures dos 40 NFTs, banco
   em memória, servidor Socket.IO simulado: ~176 KB comprimido) e registra o
   service worker. Num backend real esse código não existiria no cliente. No
   relatório ele aparece como ~600 ms de execução (`bootup-time`) e parte do
   JavaScript não usado (`unused-javascript`).
2. **O LCP depende de dados.** No mobile, o maior elemento é a imagem do
   primeiro card do catálogo. Ela só é descoberta depois que a lista chega da
   API simulada (fase "Render Delay" de 1,6 s no LCP do Início).
3. **Imagens maiores que o tamanho exibido.** As artes são WebP de ~50 KB
   exibidas a 166 px no mobile (`uses-responsive-images`: ~158 KiB). Gerar
   versões menores pediria uma ferramenta de imagem fora das dependências
   permitidas no desafio.

## O que foi feito

| Mudança                                                                                                                | Efeito medido (local, mobile)      |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `meta description` e `robots.txt` (antes o `/robots.txt` caía no rewrite da SPA e devolvia HTML)                       | SEO 83 → 100                       |
| Imagens da primeira linha do catálogo sem `loading="lazy"` e com `fetchpriority="high"` (eram o LCP e estavam adiadas) | LCP 5,4 s → 3,8 s                  |
| Servidor local com compressão, como a Vercel                                                                           | medição local comparável ao deploy |
| Altura mínima da área de conteúdo: o rodapé não aparece logo abaixo do cabeçalho para depois ser empurrado             | CLS do Detalhe desktop 0,118 → 0   |

**Testado e desfeito:** renderizar o app **antes** de o MSW subir (as chamadas
à API esperariam o mock). A tela aparecia antes, mas a execução do bundle do
mock passou a cair dentro da janela do TBT: a mediana do TBT do Início mobile
subiu de ~140 ms para ~1,3 s e a Performance caiu de 79 para 54. Voltei ao
comportamento anterior (commit 171d209).

## Diferença entre local e deploy

Na máquina onde as medições locais foram feitas, o antivírus (Kaspersky)
injeta um script `http://gc.kis.v2.scr.kaspersky-labs.com/...` no HTML de
páginas servidas por HTTP. A configuração bloqueia essa URL
(`blockedUrlPatterns`), mas a auditoria "is-on-https" ainda conta a tentativa,
e por isso **Boas práticas** dá ~82 no local e **100 no deploy**. Não é algo
do app.
