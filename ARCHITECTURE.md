# Arquitetura

Documento vivo: cada decisão entra aqui no momento em que é tomada.

## Visão geral

SPA em React + TypeScript, build com Vite. Não existe backend real: a API REST
é simulada pelo MSW, que intercepta as requisições dentro do navegador (Service
Worker). O mesmo mock roda em desenvolvimento, nos testes E2E e no build
publicado na Vercel.

```
src/
  routes/        rotas do TanStack Router (file-based)
  shared/api/    instância Axios, erros normalizados, contratos (types.ts)
  shared/lib/    utilitários (money.ts, cn)
  shared/ui/     componentes shadcn/ui adaptados aos tokens do Figma
  mocks/         backend falso: db, fixtures, handlers, cenários
tests/e2e/       specs Playwright
```

## Contratos

Os tipos de `src/shared/api/types.ts` são usados pelos dois lados: o front e os
handlers do MSW. Se um contrato muda, o TypeScript acusa os dois.

- Valores em ETH trafegam como **string decimal** (`"1.19"`). Todo cálculo usa
  `decimal.js` (`src/shared/lib/money.ts`). `number` só para quantidades
  inteiras.
- Erros seguem um formato único:
  `{ "error": { "code": "NOT_FOUND", "message": "...", "fieldErrors": {} } }`.
  O interceptor do Axios converte qualquer falha (HTTP, timeout, sem conexão)
  em `ApiError`, com `status`, `code` e `fieldErrors`.

### Endpoints implementados

| Método   | Rota              | Observações                                                                                                                                                                                                                                                             |
| -------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET      | `/api/nfts`       | `q`, `category`, `network`, `minPrice`, `maxPrice`, `tab` (`all`/`new`/`trending`), `sort` (`recent`/`price-asc`/`price-desc`/`name`), `page`, `pageSize` (padrão 9). Retorna página, total, contagem por categoria/rede e faixa de preço. 422 para parâmetro inválido. |
| GET      | `/api/nfts/:id`   | 404 se não existir.                                                                                                                                                                                                                                                     |
| GET/POST | `/api/__scenario` | Consulta/troca o cenário de rede.                                                                                                                                                                                                                                       |
| POST     | `/api/__reset`    | Restaura o banco e o cenário padrão.                                                                                                                                                                                                                                    |

## Backend simulado (MSW)

- **Banco único** em `src/mocks/db.ts`: catálogo, usuários, sessões, carrinhos,
  favoritos, carteiras, cotações e pedidos no mesmo objeto. Persistido no
  `localStorage` (`kurio:mock-db`) para sobreviver a refresh. `reset()` volta às
  fixtures.
- **Fixtures**: 40 NFTs gerados de forma determinística (sem `Math.random`). Os 9
  primeiros reproduzem a grade do Figma. Só existem 4 artes no Figma, então elas
  se repetem com nomes e preços diferentes. 2 usuários e 3 cupons (2 válidos, 1
  expirado).
- **Senhas**: o mock guarda só `sha256(salt + ":" + senha)`, nunca a senha.
- **Ativação**: `VITE_ENABLE_MOCKS=true` (arquivo `.env`, versionado porque não
  tem segredo). O `main.tsx` importa o mock de forma dinâmica e só renderiza o app
  depois que o worker está ativo, para que nenhuma requisição escape.

### Cenários de rede

Escolhidos por `?scenario=<nome>` na URL ou por `POST /api/__scenario`. Ficam
salvos no `localStorage`.

| Cenário          | Efeito                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| `default`        | 150–400 ms de latência                                                         |
| `fast`           | sem latência (usado nos testes)                                                |
| `slow`           | 2,5 s por requisição (ver skeletons)                                           |
| `random-latency` | 100–1500 ms, sequência fixa por semente: respostas fora de ordem reproduzíveis |
| `offline`        | erro de rede em toda a API                                                     |
| `server-error`   | 503 em toda a API                                                              |
| `catalog-empty`  | catálogo sem resultados                                                        |

A latência "aleatória" usa um gerador com semente fixa (mulberry32). Depois de um
reset, a sequência é sempre a mesma, e os testes ficam reproduzíveis.

## Rotas

URLs em português, porque são texto que o usuário vê. Código, API e eventos
ficam em inglês.

| URL                     | Tela                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `/`                     | Início / catálogo                                                 |
| `/nft/$id`              | Detalhe do NFT                                                    |
| `/carrinho`             | Carrinho                                                          |
| `/pagamento`            | Pagamento                                                         |
| `/pedidos/$id`          | Confirmação (o id na URL permite recuperar o pedido após refresh) |
| `/entrar`, `/cadastro`  | Login e cadastro                                                  |
| `/perfil`, `/carteiras` | Conta                                                             |
| qualquer outra          | 404 (`notFoundComponent` da rota raiz)                            |

`vercel.json` reescreve todas as rotas para `index.html`, então o acesso direto e
o refresh funcionam no deploy.

## Decisões e desvios

- **MSW 2 em vez de 3**: o `@mswjs/socket.io-binding` exige `msw ^2.10`.
- **Preço por NFT, não por edição**: as edições (1/1, 1/10, 1/50, aberta) têm
  estoque próprio, mas o mesmo preço. O Figma mostra um único preço no detalhe.
- **shadcn/ui com Radix**: o `shadcn init` não terminava de forma não interativa,
  então o `components.json` foi escrito à mão. Os componentes ficam em
  `src/shared/ui`.
- **Imagens**: as artes do Figma foram exportadas em WebP 800×800. Ainda não há
  versão menor para os cards.
