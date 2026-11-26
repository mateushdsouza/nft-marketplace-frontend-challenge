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

## Sessão e autenticação

- **Token**: o login devolve `{ token, user, expiresAt }`. O token fica no
  `localStorage` (`kurio:session-token`) para sobreviver a refresh e vai em
  toda requisição como `Authorization: Bearer` (interceptor de request do
  Axios). Sessão de 30 minutos no mock.
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
  expirar depois, a cotação falha e o resumo pede para removê-lo.
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
  - os blocos editoriais da home (promoções, "Diário da Cunhagem", newsletter) e o card "NFT em destaque" ficaram de fora: são conteúdo estático fora do escopo;
  - rodapé simplificado (faixa da marca e copyright);
  - no mobile, a barra inferior tem Início, Favoritos, Carrinho e Perfil; o botão central do Figma não tem função definida e foi omitido.
- **Detalhe vs. Figma**: o Figma repete a mesma arte nas 4 miniaturas; aqui elas mostram recortes da arte (completa, rosto, acessórios, roupa). A aba "Avaliações" e os textos de royalties/contrato ficaram de fora, porque a API não tem esses dados. "Compartilhar" copia o link do NFT.
- **Login e cadastro como páginas**: no desktop do Figma o login é um modal sobre a home; aqui `/entrar` e `/cadastro` são páginas com o mesmo card, para funcionar com acesso direto, refresh e `?redirect=`. Os campos têm rótulo visível (o Figma só usa placeholder), por acessibilidade. Login social e "Esqueceu a senha?" ficam fora do escopo e avisam isso.
- **Carrinho vs. Figma**: a seção "Colecionadores também viram" ficou de fora. O resumo mostra o total com o rótulo "Total" e a taxa como "Taxa estimada (rede)". No carrinho a taxa é sempre de Ethereum; a rede é escolhida no pagamento.
- **Ações fora do escopo** (Criadores, Aprenda, Favoritos antes do login) mostram um toast "ainda não está disponível" em vez de parecer que funcionaram.
- **Ícones**: `lucide-react` (já vem com o shadcn/ui) no lugar dos SVGs do Iconly, por serem parecidos e já otimizados.
- **Imagens**: as artes do Figma foram exportadas em WebP 800×800. Ainda não há
  versão menor para os cards.
