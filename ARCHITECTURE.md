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

| Método   | Rota              | Observações                                                                                                                                                                                                                                                                           |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET      | `/api/nfts`       | `q`, `category`, `network`, `collection`, `minPrice`, `maxPrice`, `tab` (`all`/`new`/`trending`), `sort` (`recent`/`price-asc`/`price-desc`/`name`), `page`, `pageSize` (padrão 9). Retorna página, total, contagem por categoria/rede e faixa de preço. 422 para parâmetro inválido. |
| GET      | `/api/nfts/:id`   | 404 se não existir.                                                                                                                                                                                                                                                                   |
| GET/POST | `/api/__scenario` | Consulta/troca o cenário de rede.                                                                                                                                                                                                                                                     |
| POST     | `/api/__reset`    | Restaura o banco e o cenário padrão.                                                                                                                                                                                                                                                  |

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

| Cenário            | Efeito                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `default`          | 150–400 ms de latência                                                                                        |
| `fast`             | sem latência (usado nos testes)                                                                               |
| `slow`             | 2,5 s por requisição (ver skeletons)                                                                          |
| `random-latency`   | 100–1500 ms, sequência fixa por semente: respostas fora de ordem reproduzíveis                                |
| `offline`          | erro de rede em toda a API                                                                                    |
| `server-error`     | 503 em toda a API                                                                                             |
| `catalog-empty`    | catálogo sem resultados                                                                                       |
| `wallet-rejected`  | a carteira recusa a conexão                                                                                   |
| `payment-rejected` | o pedido é criado e depois recusado pela rede                                                                 |
| `favorite-error`   | a API de favoritos responde 503 depois de 800 ms (rollback da atualização otimista)                           |
| `order-timeout`    | o pedido é criado, mas a primeira resposta se perde (erro de rede); a segunda tentativa recebe o mesmo pedido |

A latência "aleatória" usa um gerador com semente fixa (mulberry32). Depois de um
reset, a sequência é sempre a mesma, e os testes ficam reproduzíveis.

## Estado remoto e cache (TanStack Query)

| Configuração           | Valor                                                                  | Motivo                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `staleTime`            | 30 s                                                                   | O catálogo muda pouco; voltar a uma página recente não refaz a requisição. Mudanças de preço chegam por evento (Socket.IO). |
| `gcTime`               | 5 min                                                                  | Entradas sem uso saem da memória.                                                                                           |
| `retry`                | até 2 vezes, **só** para falha transitória (sem conexão, timeout, 503) | Repetir 404/401/422 não muda o resultado. Mutations nunca repetem sozinhas (evita compra duplicada).                        |
| `refetchOnWindowFocus` | desligado                                                              | Evita requisições surpresa durante os testes; a reconciliação vem do socket.                                                |

Chaves de query (`src/features/catalog/queries.ts`):

- `["nfts", "list", params]`: cada combinação de filtros tem sua entrada.
- `["nfts", "detail", id]`

**Respostas fora de ordem**: a tela só lê a chave dos parâmetros atuais. Se a
resposta de um filtro antigo chegar depois, ela é gravada na chave antiga e não
aparece. Além disso, o `signal` do Query vai para o Axios e cancela a
requisição anterior quando os parâmetros mudam.

`placeholderData: keepPreviousData` mantém a página anterior visível (com
opacidade reduzida e `aria-busy`) enquanto a nova carrega, sem layout shift.

## Catálogo: URL como estado

Busca, filtros, aba, ordenação e página vivem na URL e são validados por um
schema zod no `validateSearch` da rota `/`. Valor inválido na URL cai no
padrão em vez de quebrar a página. Valores padrão são removidos da URL
(`stripSearchParams`).

- Mudar qualquer filtro volta para a página 1.
- A busca tem debounce de 350 ms e usa `replace` no histórico, para cada letra
  não virar uma entrada do "voltar".
- Contagens por categoria e rede vêm da API e consideram os outros filtros
  ativos.

## Detalhe do NFT

- O `loader` da rota chama `queryClient.ensureQueryData`: no acesso direto pela
  URL os dados chegam antes da tela, e na navegação a partir do catálogo o cache é
  reaproveitado. Um 404 da API vira `notFound()` e mostra "NFT não encontrado";
  outras falhas caem no `errorComponent` com "Tentar novamente"
  (`router.invalidate()`).
- A edição escolhida começa na primeira com estoque. Edição esgotada aparece
  riscada, com o texto "(esgotada)" (o estado não depende só de cor), e o radio
  fica desabilitado.
- A quantidade vai de 1 até o estoque da edição. Se o estoque cair depois da
  escolha (evento em tempo real), o valor exibido é limitado ao disponível.

## Favoritos (atualização otimista)

- `GET /api/favorites` devolve `{ nftIds }`; `PUT` e `DELETE
/api/favorites/:nftId` incluem/removem e devolvem a lista atualizada. Exigem
  sessão; a chave do cache é `["user", userId, "favorites"]`.
- Visitante que clica em "Favoritar" vai para o login com `?redirect=` e volta
  ao NFT.
- **Otimista** (`src/features/favorites/mutations.ts`): `onMutate` cancela
  buscas de favoritos em andamento, guarda o estado atual e grava o novo;
  `onError` devolve o estado guardado e mostra um toast; `onSettled` confere
  com a API **só quando a última mutation em andamento termina**
  (`isMutating === 1`), para cliques rápidos não serem desfeitos por uma
  resposta intermediária.
- O cenário `favorite-error` deixa a API de favoritos (leitura e escrita) fora
  do ar com 800 ms de atraso. A leitura também falha de propósito: assim o
  teste só passa se o rollback funcionar, sem a nova busca mascarar a falta
  dele.

## Perfil e carteiras

- `GET/PATCH /api/profile`: 422 com erros por campo; 409 `EMAIL_TAKEN` para
  e-mail de outra conta (e `CONFLICT` para nome de usuário repetido). A
  resposta do `PATCH` é gravada no cache do perfil **e** no usuário da sessão,
  então o nome e a foto do cabeçalho mudam sem nova requisição.
- `POST/DELETE /api/profile/avatar`: o arquivo vai como data URL em JSON.
  PNG, JPG ou WebP, até **1 MB** (o banco do mock fica no `localStorage`, que
  tem pouco espaço). O front valida antes de enviar e mostra a prévia com
  `URL.createObjectURL`, revogada no cleanup do efeito.
- `POST /api/profile/password`: confere o hash da senha atual (422 no campo
  `currentPassword` se errada), gera sal novo e guarda só o hash.
- Carteiras: um espaço principal e um secundário por usuário. O endereço é
  validado **conforme a rede** (`src/shared/lib/wallet-address.ts`, usado pelo
  front e pelo mock): Ethereum/Polygon `0x` + 40 hexadecimais; Solana base58
  com 32 a 44 caracteres. Editar uma carteira desconecta a sessão simulada
  dela.

## Sessão e autenticação

- **Token**: o login devolve `{ token, user, expiresAt }`. O token fica no
  `localStorage` (`kurio:session-token`) para sobreviver a refresh e vai em
  toda requisição como `Authorization: Bearer` (interceptor de request do
  Axios). Sessão de 30 minutos no mock. **Limitação consciente:** um token em
  `localStorage` pode ser lido por qualquer script da página (risco em caso de
  XSS). Com um backend real, o certo seria um cookie `HttpOnly` + `Secure` +
  `SameSite`, que o JavaScript não lê. Aqui o "servidor" é o MSW, que roda no
  próprio navegador, então essa proteção não teria efeito real.
- **Recuperação no refresh**: a query `["session"]` chama
  `GET /api/auth/session` quando existe token. Sem token, o usuário é visitante
  e nenhuma requisição é feita.
- **Rotas privadas**: ficam dentro da rota sem caminho `_auth`
  (`src/routes/_auth/`), cujo `beforeLoad` confere a sessão e redireciona para
  `/entrar?redirect=<endereço atual>`. Hoje são privadas: pagamento, perfil,
  carteiras e pedidos. O carrinho é público (carrinho de visitante).
- **Retorno ao fluxo**: depois do login, a navegação vai para o `redirect`. Só
  são aceitos caminhos internos (começando com `/` e não `//`), para o
  parâmetro não servir de redirecionamento para outro site.
- **Expiração**: um 401 numa requisição que levou token significa sessão
  encerrada no servidor. O interceptor apaga o token e avisa o
  `SessionWatcher`, que remove os dados privados do cache, mostra um aviso e,
  se a tela atual for privada, leva ao login guardando o endereço.
- **Logout e troca de usuário**: removem do cache todas as queries privadas
  (`["user", userId, ...]`) e gravam a nova sessão (ou `null`). O catálogo é
  público e continua em cache. Usar `queryClient.clear()` não serve: ele desliga
  as queries que já estão sendo observadas, e o cabeçalho ficava mostrando o
  estado antigo.
- **Isolamento**: toda query de dado privado leva o id do usuário na chave, então
  o cache de um usuário nunca é lido por outro.
- **Erros da API nos formulários**: `fieldErrors` de 422/409 vão para o campo
  correspondente (`setError` do react-hook-form). Login inválido devolve a mesma
  mensagem para e-mail inexistente e senha errada.

| Método | Rota                     | Respostas                                                 |
| ------ | ------------------------ | --------------------------------------------------------- |
| POST   | `/api/auth/register`     | 201 sessão · 422 validação · 409 e-mail ou usuário em uso |
| POST   | `/api/auth/login`        | 200 sessão · 401 credenciais inválidas                    |
| GET    | `/api/auth/session`      | 200 sessão · 401 sem token / expirada                     |
| POST   | `/api/auth/logout`       | 204                                                       |
| POST   | `/api/__sessions/expire` | controle: expira todas as sessões                         |

## Carrinho

- **Onde fica**: na API (mock), não no front. O front guarda só quem é o dono:
  o token do usuário ou o id do carrinho de visitante
  (`kurio:guest-cart` no `localStorage`, enviado no header `X-Guest-Cart`).
  O id do visitante é criado na primeira inclusão.
- **Isolamento**: a chave do cache é `["user", userId, "cart"]` ou
  `["guest", guestId, "cart"]`. No mock, o carrinho de usuário só é acessível
  com token válido; ids de visitante têm outro prefixo.
- **Toda mutation devolve o carrinho inteiro** já recalculado. O front grava essa
  resposta no cache (`setQueryData`) e não soma nada sozinho. Antes de gravar,
  cancela leituras em andamento do carrinho: um `GET` que saiu antes poderia
  responder depois com o estado antigo (o teste "Comprar" pegou isso).
- **Estoque**: incluir ou alterar acima do disponível devolve 409 com a
  quantidade que existe. Se o estoque cair depois (outro comprador, evento em
  tempo real), o item mostra um aviso e o checkout fica bloqueado até ajustar.
- **Cupom**: fica salvo no carrinho (`PUT/DELETE /api/cart/coupon`). Código
  inexistente ou expirado devolve 422 com erro no campo. Se um cupom aplicado
  expirar depois, a cotação falha e o resumo pede para removê-lo. O cupom vale
  para o carrinho, não para um item: continua aplicado enquanto houver itens e
  é removido quando o carrinho fica vazio.
- **Cotação** (`POST /api/quote`): subtotal, desconto, taxa de rede e total são
  calculados na API com `decimal.js`. A query da cotação usa na chave os itens,
  quantidades, preço e versão de cada NFT, o cupom e a rede. Qualquer mudança
  gera uma cotação nova. A cotação vale 5 minutos e é guardada para o checkout.
- **Login com itens de visitante**: logo após o login (ou cadastro), o front chama
  `POST /api/cart/merge`. A API soma as quantidades respeitando o estoque, avisa
  se precisou ajustar e apaga o carrinho do visitante. Se a junção falhar, o id
  do visitante é mantido para tentar no próximo login.

| Método | Rota                      | Respostas                                       |
| ------ | ------------------------- | ----------------------------------------------- |
| GET    | `/api/cart`               | 200 carrinho (vazio se não houver dono)         |
| POST   | `/api/cart/items`         | 201 carrinho · 404 · 409 sem estoque · 422      |
| PATCH  | `/api/cart/items/:itemId` | 200 · 404 · 409 · 422                           |
| DELETE | `/api/cart/items/:itemId` | 200 carrinho                                    |
| PUT    | `/api/cart/coupon`        | 200 · 422 `COUPON_INVALID` / `COUPON_EXPIRED`   |
| DELETE | `/api/cart/coupon`        | 200                                             |
| POST   | `/api/cart/merge`         | 200 `{ cart, adjusted }` · 401                  |
| POST   | `/api/quote`              | 200 cotação · 404 · 409 sem estoque · 422 cupom |

## Pagamento e pedidos

Fluxo em `/pagamento` (rota privada):

1. **Dados do colecionador** (react-hook-form + zod) e **carteira e rede**. As
   carteiras vêm de `GET /api/wallets`. A rede precisa ser a da carteira.
2. **Conectar a carteira**: `POST /api/wallets/:id/connect` simula a aprovação
   (ou a recusa, no cenário `wallet-rejected`). A conexão vive só na memória do
   mock: recarregar a página "desconecta", como numa extensão real. Sem conexão
   não há revisão.
3. **Revisão**: "Revisar pedido" pede uma cotação nova (`POST /api/quote`). É
   essa cotação, com id, que o usuário vê e confirma.
4. **Confirmação**: `POST /api/orders` com `{ quoteId, walletId, buyer }` e o
   header `Idempotency-Key`.

### Idempotência

- A chave é gerada **uma vez por tentativa** e guardada no `sessionStorage`
  junto do `quoteId` (`src/features/checkout/attempt.ts`). Clique repetido, erro
  de rede ou refresh reenviam a **mesma** chave.
- Na API: mesma chave + mesmo conteúdo → devolve o pedido que já existe; mesma
  chave + conteúdo diferente → 409 `IDEMPOTENCY_CONFLICT`. A checagem da chave
  vem antes de qualquer outra validação.
- O botão "Confirmar compra" fica desabilitado durante o envio, e a função
  ignora cliques enquanto há um envio em andamento.
- Cotação nova (preço mudou) → `quoteId` novo → chave nova: é outra tentativa.

### Revalidação antes de confirmar

A API refaz a cotação com o catálogo atual (preço, estoque, cupom, taxa). Se
algo mudou, ou se a cotação expirou (5 min), responde 409 `QUOTE_CHANGED` com a
cotação nova em `error.details.quote`. A tela mostra o total antigo e o novo e
exige um novo clique em "Confirmar compra". Estoque esgotado ou cupom vencido
voltam como 409/422 e mandam o usuário de volta ao formulário.

### Estados do pedido

`pending` → `confirmed` | `rejected` (terminais). O resultado é decidido na
criação (pelo cenário) e aplicado ~2 s depois. O mock guarda no próprio pedido o
resultado e o horário de aplicação, então a liquidação acontece por timer **ou**
na próxima consulta, inclusive depois de um refresh.

- **Confirmado**: baixa o estoque, aumenta a versão dos NFTs e remove do
  carrinho **só os itens e quantidades comprados**. Gera hash e link de
  explorador simulados.
- **Recusado**: nada muda no carrinho nem no estoque.
- A tela `/pedidos/$id` consulta o pedido a cada 1 s enquanto ele está pendente.
  O id na URL permite recuperar o pedido depois de recarregar a página. A
  confirmação só aparece quando a API devolve `status: "confirmed"`.
- **Recibo como snapshot**: o pedido guarda itens, preços, desconto, taxa e
  total da cotação confirmada. O recibo lê só o pedido, nunca o catálogo.
- **Isolamento**: `GET /api/orders/:id` de outro usuário responde 403, e a tela
  mostra "Pedido não encontrado" (igual ao 404, sem revelar que o pedido existe).

| Método | Rota                          | Respostas                                                                                                                  |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/wallets`                | 200 · 401                                                                                                                  |
| POST   | `/api/wallets`                | 201 · 409 espaço ocupado · 422                                                                                             |
| PATCH  | `/api/wallets/:id`            | 200 · 404 · 422                                                                                                            |
| POST   | `/api/wallets/:id/connect`    | 200 · 409 `WALLET_REJECTED`                                                                                                |
| POST   | `/api/wallets/:id/disconnect` | 200                                                                                                                        |
| POST   | `/api/orders`                 | 201 criado · 200 mesma chave · 409 `IDEMPOTENCY_CONFLICT` / `QUOTE_CHANGED` / `WALLET_DISCONNECTED` / `OUT_OF_STOCK` · 422 |
| GET    | `/api/orders`                 | 200 pedidos do usuário                                                                                                     |
| GET    | `/api/orders/:id`             | 200 · 403 de outro usuário · 404                                                                                           |
| POST   | `/api/__nfts/:id`             | controle: altera preço ou estoque de um NFT                                                                                |

## Tempo real (Socket.IO)

### Transporte no ambiente de mocks

- O app usa o `socket.io-client` de verdade, conectando em
  `<origem>/socket.io/` só com o transporte `websocket` (sem long-polling).
- O MSW intercepta o WebSocket no navegador (`ws.link`) e o
  `@mswjs/socket.io-binding` traduz o protocolo Engine.IO/Socket.IO. O servidor
  falso fica em `src/mocks/realtime.ts`.
- **Detalhes que fizeram diferença:**
  - O MSW remove o `/socket.io/` do caminho antes de comparar, então o
    `ws.link` aponta para a raiz da origem. Conexões que não são `/socket.io/`
    (o hot reload do Vite) passam direto para o servidor real.
  - O `engine.io-client` guarda o `WebSocket` global quando o módulo carrega. Por
    isso o `socket.io-client` é importado de forma dinâmica, depois que o MSW
    já trocou o `WebSocket` pelo dele.
  - O binding faz o handshake, mas não manda o ping do Engine.IO. O mock envia
    um ping a cada 20 s; sem isso o cliente desconectaria a cada 30 s.
- **Limitações**: sem long-polling, sem namespaces nem rooms (o binding não
  implementa); o "broadcast" é um laço sobre as conexões abertas na aba. Cada
  aba tem seu próprio servidor falso, então um evento disparado numa aba não
  chega em outra.
- Sem acesso ao `auth` do handshake pelo binding, o cliente se identifica
  depois de conectar, com o evento `session.join` (token da sessão). O servidor
  falso guarda o dono de cada conexão e manda `order.updated` só para ele.
- Quando o mock fecha uma conexão que ainda está abrindo, o cliente não recebe
  erro, só o fechamento. Por isso o cliente usa `timeout: 4000`: a tentativa
  sem resposta conta como falha e ele tenta de novo.

### Eventos

| Evento          | Quem recebe         | `data`                                     | Quando                                                            |
| --------------- | ------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| `nft.updated`   | todas as conexões   | `priceEth`, `previousPriceEth`, `editions` | preço ou estoque mudou (controle `__nfts/:id`, pedido confirmado) |
| `order.updated` | só o dono do pedido | o pedido inteiro (`Order`)                 | pedido saiu de pendente                                           |

Todo evento tem `eventId`, `resource { type, id }` e `version` (a mesma
`version` do recurso no REST).

### Reconciliação REST × Socket.IO

- **Duplicados e antigos**: um porteiro (`createEventGate`) recusa `eventId` já
  visto e `version` menor ou igual à última aplicada do recurso. Além disso, cada
  atualização do cache compara com a `version` que está lá, porque o REST pode
  já ter trazido um dado mais novo que o evento.
- **nft.updated**: atualiza o detalhe e todas as listas em cache com
  `setQueryData`/`setQueriesData`, sem nova requisição. Se o NFT está no
  carrinho, mostra um aviso (toast com `aria-live`) e busca o carrinho de novo;
  a cotação é refeita porque preço e versão fazem parte da chave dela.
- **order.updated**: troca o pedido do cache e, se confirmado, marca o
  carrinho como velho. Enquanto o carrinho é buscado de novo, eventos de NFT
  não geram aviso (evita avisar "esgotou" do item que a pessoa acabou de comprar).
- **Reconexão**: na volta da conexão, `invalidateQueries()` busca de novo tudo
  que está na tela. É assim que um pedido que terminou com o socket fora do ar
  aparece certo. A página do pedido ainda consulta a cada 15 s enquanto ele
  está pendente, como reserva caso o socket não volte.
- **Primeira conexão**: ao entrar na sessão do socket, o app busca de novo os
  pedidos que estão na tela. Sem isso havia uma corrida: depois de um refresh
  com pedido pendente, a página buscava o pedido pelo REST, o mock o liquidava
  e emitia `order.updated` antes de o socket entrar na sessão, e o evento se
  perdia (a tela só se corrigia na consulta de reserva de 15 s).
- **Sessão**: um socket por sessão. Login, logout ou troca de usuário
  desconectam o socket antigo (com `off` dos listeners) e abrem outro, com um
  porteiro novo.
- **Checkout**: se, durante a revisão, chega uma cotação mais nova que cobra
  diferente da revisada, "Confirmar compra" fica bloqueado até a pessoa aceitar
  o novo valor. Com o socket fora do ar, quem barra é a revalidação da API (409
  `QUOTE_CHANGED`).

### Controles para testes

| Endpoint                                                         | Efeito                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `POST /api/__nfts/:id` `{ priceEth?, editionId?, available? }`   | muda o NFT e emite `nft.updated`                                   |
| `POST /api/__realtime/replay` `{ mode: 'duplicate' \| 'stale' }` | reenvia o último evento igual, ou o penúltimo com id novo          |
| `POST /api/__realtime/connection` `{ offline }`                  | derruba o servidor Socket.IO e recusa conexões, ou volta ao normal |

## Rotas

URLs em português, porque são texto que o usuário vê. Código, API e eventos
ficam em inglês.

| URL                     | Tela                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `/`                     | Início / catálogo                                                 |
| `/nft/$id`              | Detalhe do NFT                                                    |
| `/carrinho`             | Carrinho                                                          |
| `/pagamento` (privada)  | Pagamento                                                         |
| `/pedidos/$id`          | Confirmação (o id na URL permite recuperar o pedido após refresh) |
| `/entrar`, `/cadastro`  | Login e cadastro                                                  |
| `/perfil`, `/carteiras` | Conta                                                             |
| qualquer outra          | 404 (`notFoundComponent` da rota raiz)                            |

`vercel.json` reescreve todas as rotas para `index.html`, então o acesso direto e
o refresh funcionam no deploy.

## Testes E2E (Playwright)

- Chromium em dois projetos: `desktop` (1440×900) e `mobile` (Pixel 7,
  390×844). Cada teste começa com `POST /api/__reset` e o cenário `fast`.
- Relatório HTML em `playwright-report/`; trace e screenshot só das falhas.
- **Teclado e foco** (`keyboard.spec.ts`): link "Pular para o conteúdo", fluxo
  catálogo → detalhe → carrinho só com teclado, foco preso e devolvido na
  gaveta de filtros, foco no primeiro campo inválido. O teste confere que o
  foco tem um indicador **desenhado** (contorno ou sombra), não só o estado
  `:focus-visible`.
- **Regressão visual** (`visual.spec.ts`): início, detalhe, carrinho e
  pagamento, nos dois projetos, em página inteira, com dados fixos e animações
  paradas. `tests/support/screenshot.css` esconde o que muda com o tempo
  (toasts, devtools do router). Nos prints de página inteira a barra inferior
  do mobile (fixa) fica escondida, senão apareceria no meio cobrindo o
  conteúdo; ela é conferida no print da primeira tela (`inicio-tela.png`).
- As baselines foram geradas no **Windows** (sufixo `-win32`). A renderização
  de fontes muda entre sistemas, então em Linux/macOS é preciso gerar as
  próprias: `npx playwright test visual --update-snapshots`.

## Performance (Lighthouse)

Configuração, comandos, resultados e a análise do que ficou abaixo da meta
estão em [`lighthouse/README.md`](lighthouse/README.md). Resumo do deploy
(mediana de 3): Acessibilidade, Boas práticas e SEO 100 nas quatro
combinações; Performance 99 no desktop, 90 no Detalhe mobile e 85 no Início
mobile. O Início mobile fica abaixo de 90 principalmente porque o backend
simulado (MSW, fixtures, banco em memória) é baixado e executado no navegador
antes da primeira renderização.

## Decisões e desvios

- **MSW 2 em vez de 3**: o `@mswjs/socket.io-binding` exige `msw ^2.10`.
- **Preços sempre em ETH, em qualquer rede**: o Figma mostra o filtro de rede
  (Ethereum, Polygon, Solana), mas todos os preços em ETH, e o enunciado trata
  todos os valores como ETH. No mundo real, um NFT da Solana seria cotado em SOL.
  Aqui a rede muda só a taxa de rede da cotação.
- **Categoria vs. coleção**: a lista "Coleções" da sidebar do Figma traz
  categorias (Arte digital, Fotografia…), e é esse o filtro da URL
  (`category`). A coleção do NFT (ex.: Kurio Apes) tem um filtro próprio na API
  (`collection`), usado em "Mais desta coleção" no detalhe.
- **Preço por NFT, não por edição**: as edições (1/1, 1/10, 1/50, aberta) têm
  estoque próprio, mas o mesmo preço. O Figma mostra um único preço no detalhe.
- **shadcn/ui com Radix**: o `shadcn init` não terminava de forma não interativa,
  então o `components.json` foi escrito à mão. Os componentes ficam em
  `src/shared/ui`.
- **Catálogo vs. Figma**:
  - campo de busca visível acima da grade em todas as larguras (no desktop do Figma só há o ícone no header, que agora leva até ele);
  - faixa de preço com dois campos numéricos em vez do slider: é mais fácil de usar pelo teclado e de validar;
  - os blocos fixos da home (card "NFT em destaque", as duas promoções e o "Diário da Cunhagem") seguem o Figma. Os botões levam a telas reais (o NFT em destaque, novos lançamentos, arte digital); os artigos do diário são editoriais, fora do escopo, e o "Ler mais" avisa isso;
  - rodapé completo como no Figma. Links com destino real funcionam (perfil, carteiras, categorias do catálogo); os demais, a newsletter e as redes sociais avisam que não estão disponíveis, sem fingir que funcionaram;
  - a home mobile segue o frame do Figma: sem o cabeçalho do site, abre na busca com o botão de filtros, depois o hero compacto, as abas e a grade em duas colunas desencontradas (a da direita 32 px mais baixa). No HTML o hero vem antes da busca, como no desktop; o mobile só reordena com CSS (`order`), para a ordem de tabulação continuar a do desktop. Sem o cabeçalho, a sessão aparece no item Perfil da barra inferior (avatar e nome acessível "Perfil de …"); entrar e sair ficam no login e no cabeçalho das outras telas;
  - no mobile a ordenação fica dentro da gaveta de filtros e a contagem de resultados é só para leitor de tela (o frame não tem nenhum dos dois). As abas usam 13 px abaixo de 400 px para caber numa linha em telas estreitas;
  - a barra inferior segue o Figma: só ícones (nomes para leitor de tela) e o botão central elevado. O botão central é leitura de QR code, fora do escopo, e avisa isso;
  - o coração de favoritar e o selo "RARO" dos cards do Figma não foram feitos: um botão dentro do link do card seria um elemento interativo dentro de outro, e a API não tem campo de raridade. Favoritar fica no detalhe;
  - as outras telas mobile (detalhe, carrinho, pagamento) mantêm o cabeçalho do site e o layout empilhado do desktop, em vez das barras de ação próprias dos frames.
- **Detalhe vs. Figma**: o Figma repete a mesma arte nas 4 miniaturas; aqui elas mostram recortes da arte (completa, rosto, acessórios, roupa). A aba "Avaliações" e os textos de royalties/contrato ficaram de fora, porque a API não tem esses dados. "Compartilhar" copia o link do NFT.
- **Login e cadastro como páginas**: no desktop do Figma o login é um modal sobre a home; aqui `/entrar` e `/cadastro` são páginas com o mesmo card, para funcionar com acesso direto, refresh e `?redirect=`. Os campos têm rótulo visível (o Figma só usa placeholder), por acessibilidade. Login social e "Esqueceu a senha?" ficam fora do escopo e avisam isso.
- **Carrinho vs. Figma**: "Colecionadores também viram" mostra NFTs em alta que não estão no carrinho (dados da API, mesmo componente do "Mais desta coleção"). O resumo mostra o total com o rótulo "Total" e a taxa como "Taxa estimada (rede)". No carrinho a taxa é sempre de Ethereum; a rede é escolhida no pagamento.
- **Pagamento vs. Figma**: o formulário pede nome de exibição, nome de usuário, e-mail e observação. Endereço, tipo de carteira e rede vêm das carteiras cadastradas (seleção + rede) em vez de campos soltos; ENS, nome do perfil e código de indicação ficaram de fora. "Usar outra carteira?" virou um link para `/carteiras`. Antes de confirmar existe uma etapa de revisão, que o Figma não mostra e o enunciado exige.
- **Timeout do pedido**: simulado como resposta perdida (erro de rede depois de o pedido ser criado), em vez de esperar o timeout de 15 s do Axios, para os testes não ficarem lentos. O efeito para o front é o mesmo: ele não sabe se o pedido existe e reenvia com a mesma chave.
- **Ações fora do escopo** (Criadores, Aprenda, Favoritos antes do login) mostram um toast "ainda não está disponível" em vez de parecer que funcionaram.
- **Ícones**: `lucide-react` (já vem com o shadcn/ui) no lugar dos SVGs do Iconly, por serem parecidos e já otimizados.
- **Imagens**: as artes do Figma foram exportadas em WebP 800×800. Uma versão
  de 400 px (`nft-NN-400.webp`, gerada por `scripts/resize-images.mjs`) entra
  no `srcset` dos cards, miniaturas e seções da home.
