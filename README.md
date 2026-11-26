# Kurio — marketplace de NFTs

Front-end de um marketplace de NFTs feito para o desafio de front-end da Jungle
Gaming: catálogo com busca e filtros, detalhe do NFT, carrinho, pagamento com
carteira simulada, pedido com confirmação em tempo real, conta, perfil e
carteiras. Versões desktop e mobile.

**Demo:** https://nft-marketplace-frontend-challenge.vercel.app

Não existe backend real. API REST, autenticação, carteiras, pagamentos e o
servidor Socket.IO são simulados com [MSW](https://mswjs.io) dentro do
navegador, tanto em desenvolvimento quanto no build publicado.

As decisões técnicas (contratos, sessão, cache, tempo real, limitações e
desvios do Figma) estão em [ARCHITECTURE.md](ARCHITECTURE.md).

## Stack

React 19 + TypeScript · Vite · TanStack Router · TanStack Query · Axios ·
Socket.IO (`socket.io-client`) · Tailwind CSS · shadcn/ui · MSW +
`@mswjs/socket.io-binding` · Playwright · Lighthouse CI · zod +
react-hook-form · decimal.js

## Requisitos

- Node.js **20.19+** ou **22.12+** (exigência do Vite 8)
- npm

## Como rodar

```bash
npm ci
npm run dev          # http://localhost:5173, com os mocks ligados
```

Build de produção (o mesmo que vai para a Vercel):

```bash
npm run build
npm run preview      # http://localhost:4173
```

## Variáveis de ambiente

| Variável            | Padrão             | Para quê                                                              |
| ------------------- | ------------------ | --------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | `true` (no `.env`) | Liga o backend simulado (MSW). Fica ligado também no build publicado. |
| `VITE_API_URL`      | `/api`             | Base das chamadas REST do Axios.                                      |

O `.env` já vem no repositório; não há segredos nem serviços privados.

## Scripts

| Comando                           | O que faz                                                               |
| --------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                     | servidor de desenvolvimento com mocks                                   |
| `npm run build`                   | typecheck + build de produção em `dist/`                                |
| `npm run preview`                 | serve o build                                                           |
| `npm run typecheck`               | checagem de tipos (`tsc -b`)                                            |
| `npm run lint`                    | ESLint                                                                  |
| `npm run format` / `format:check` | Prettier                                                                |
| `npm run test:e2e`                | testes Playwright (desktop e mobile)                                    |
| `npm run test:e2e:report`         | abre o relatório HTML do último teste                                   |
| `npm run lighthouse`              | auditoria Lighthouse (ver [lighthouse/README.md](lighthouse/README.md)) |

## Contas de teste

| Usuário        | E-mail              | Senha       |
| -------------- | ------------------- | ----------- |
| Colecionador A | `alice@example.com` | `Senha@123` |
| Colecionador B | `bob@example.com`   | `Senha@123` |

A Alice já tem uma carteira principal e um NFT favoritado; o Bob começa sem
carteira, para testar o cadastro. As senhas ficam no mock só como hash
(SHA-256 com sal).

**Cupons:** `KURIO10` (10%), `GENESIS25` (25%), `LANCAMENTO` (expirado).
Qualquer outro código é inválido.

## Cenários do backend simulado

O estado do mock (catálogo, carrinho, pedidos, perfil…) fica no
`localStorage` e sobrevive a refresh.

**Trocar de cenário:** abra qualquer página com `?scenario=<nome>`, por
exemplo `/?scenario=slow`. O cenário fica salvo até ser trocado de novo.

**Voltar ao estado inicial:** no console do navegador,

```js
await fetch('/api/__reset', { method: 'POST' })
```

e recarregue a página. Isso restaura os dados de fábrica e o cenário
`default`.

| Cenário            | Efeito                                                    |
| ------------------ | --------------------------------------------------------- |
| `default`          | latência curta (150–400 ms), tudo funciona                |
| `fast`             | sem latência (usado nos testes)                           |
| `slow`             | toda requisição demora ~2,5 s (skeletons)                 |
| `random-latency`   | latência variável e reproduzível: respostas fora de ordem |
| `offline`          | falha de conexão em toda a API                            |
| `server-error`     | HTTP 503 em toda a API                                    |
| `catalog-empty`    | catálogo sem resultados                                   |
| `wallet-rejected`  | a carteira recusa a conexão                               |
| `payment-rejected` | o pedido é criado e depois recusado                       |
| `order-timeout`    | o pedido é criado, mas a primeira resposta se perde       |
| `favorite-error`   | a API de favoritos responde 503 (rollback otimista)       |

Outros controles (também usados pelos testes E2E):

| Endpoint                                                            | Efeito                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `POST /api/__sessions/expire`                                       | expira todas as sessões abertas                                          |
| `POST /api/__nfts/:id` `{ priceEth }` ou `{ editionId, available }` | muda preço ou estoque "por outra pessoa"; a mudança chega pelo Socket.IO |
| `POST /api/__realtime/replay` `{ mode: "duplicate" \| "stale" }`    | reenvia um evento repetido ou antigo                                     |
| `POST /api/__realtime/connection` `{ offline: true \| false }`      | derruba ou volta a conexão do socket                                     |

## Como reproduzir os fluxos de falha

Use o cenário indicado na URL e siga os passos.

| Fluxo                             | Como ver                                                                                                                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Erro e nova tentativa no catálogo | `/?scenario=server-error` → mensagem de erro; troque para `/?scenario=default` e clique em "Tentar novamente"                                                                                                                          |
| Carregamento lento                | `/?scenario=slow` → skeletons no catálogo, no detalhe e no resumo do carrinho                                                                                                                                                          |
| Respostas fora de ordem           | `/?scenario=random-latency` e troque filtros rápido: a lista sempre mostra o último filtro                                                                                                                                             |
| Resultado vazio                   | busque por um nome que não existe, ou `/?scenario=catalog-empty`                                                                                                                                                                       |
| NFT inexistente                   | `/nft/nao-existe`                                                                                                                                                                                                                      |
| Cadastro com e-mail repetido      | cadastre `alice@example.com`                                                                                                                                                                                                           |
| Sessão expirada                   | entre, rode `fetch('/api/__sessions/expire', { method: 'POST' })` no console e navegue: o app pede login e volta para onde você estava                                                                                                 |
| Cupom inválido ou expirado        | no carrinho, aplique `XYZ` ou `LANCAMENTO`                                                                                                                                                                                             |
| Carteira recusa                   | `/?scenario=wallet-rejected`, vá ao pagamento e conecte a carteira                                                                                                                                                                     |
| Pagamento recusado                | `/?scenario=payment-rejected` e conclua uma compra: o pedido termina recusado e os itens continuam no carrinho                                                                                                                         |
| Timeout com recuperação           | `/?scenario=order-timeout`, confirme a compra, clique em confirmar de novo quando pedir: o mesmo pedido é recuperado (sem duplicar)                                                                                                    |
| Preço muda durante a compra       | com um NFT no carrinho, rode `fetch('/api/__nfts/nft_001', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceEth: '2.00' }) })`: o carrinho avisa e o pagamento bloqueia a cotação antiga |
| Falha ao favoritar                | `/?scenario=favorite-error`, entre e clique em Favoritar: o coração acende e volta, com aviso                                                                                                                                          |

## Testes

```bash
npx playwright install chromium   # primeira vez
npm run test:e2e
npm run test:e2e:report           # relatório HTML
```

- Chromium em dois projetos: **desktop** (1440×900) e **mobile** (390×844).
- Cada teste começa com os mocks resetados.
- Traces e screenshots só das falhas, em `test-results/`.
- Regressão visual (`toHaveScreenshot`) do início, detalhe, carrinho e
  pagamento. As baselines foram geradas no Windows; em outro sistema, gere as
  suas com `npx playwright test visual --update-snapshots`.
- Para rodar contra o deploy: `BASE_URL=https://nft-marketplace-frontend-challenge.vercel.app npm run test:e2e`.

Cobertura, por arquivo em `tests/e2e/`:

| Arquivo              | O que cobre                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `catalog.spec.ts`    | busca, filtros combinados, ordenação, paginação, histórico, vazio, erro e retry, skeleton                    |
| `nft-detail.spec.ts` | acesso direto, 404, edição esgotada, limite de quantidade                                                    |
| `auth.spec.ts`       | cadastro, login, expiração de sessão, logout, troca de usuário                                               |
| `favorites.spec.ts`  | favoritos, falha da mutation e rollback                                                                      |
| `cart.spec.ts`       | quantidades, remoção, cupom, persistência após refresh e login                                               |
| `checkout.spec.ts`   | compra completa, pagamento recusado, clique repetido, timeout                                                |
| `account.spec.ts`    | perfil, avatar, senha e carteiras, com erros de validação                                                    |
| `realtime.spec.ts`   | preço e estoque via Socket.IO, checkout bloqueado, eventos duplicados/antigos, reconexão com pedido pendente |
| `keyboard.spec.ts`   | navegação por teclado, foco em diálogos, foco no erro do formulário                                          |
| `visual.spec.ts`     | regressão visual                                                                                             |

## Lighthouse

`npm run lighthouse` audita Início e Detalhe, mobile e desktop, 3 medições
cada, e grava as medianas em `lighthouse/RESULTS.md`. Resultados do deploy,
análise do que ficou abaixo da meta e relatórios completos em
[lighthouse/README.md](lighthouse/README.md).

## Estrutura

```
src/
  app/          QueryClient
  routes/       rotas (TanStack Router, baseado em arquivos)
  features/     auth, catalog, nft-detail, cart, checkout, favorites, profile, wallets
  shared/       cliente Axios e contratos, Socket.IO, componentes de UI, utilitários
  mocks/        backend simulado: banco, fixtures, handlers REST, Socket.IO, cenários
tests/
  e2e/          specs Playwright
  support/      helpers (reset, login, compra, prints)
lighthouse/     análise, resumos e relatórios
scripts/        auditoria Lighthouse e servidor do build
```
