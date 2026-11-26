import { expect, test } from '@playwright/test'
import { ALICE, BOB, loginAs } from '../support/auth'
import { callApi, resetMocks, setScenario } from '../support/mocks'
import {
  addToCart,
  confirmButton,
  connectWallet,
  goToReview,
  ordersOf,
} from '../support/shop'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

test('valida os dados do colecionador antes da revisão', async ({ page }) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await page.goto('/pagamento')
  await connectWallet(page)

  await page.getByLabel('Nome de exibição *').fill('')
  await page.getByLabel('E-mail *').fill('email-invalido')
  await page
    .getByLabel('Observação do colecionador (opcional)')
    .fill('x'.repeat(281))
  await page.getByRole('button', { name: 'Revisar pedido' }).click()

  await expect(page.getByText('Digite seu nome de exibição.')).toBeVisible()
  await expect(page.getByText('Digite um e-mail válido.')).toBeVisible()
  await expect(page.getByText('Use no máximo 280 caracteres.')).toBeVisible()
  await expect(page.getByLabel('E-mail *')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByText('Revise antes de confirmar')).toHaveCount(0)
})

test('compra completa: do catálogo ao recibo confirmado', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /Emerald Ape #042/ }).click()
  await page.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(page).toHaveURL('/carrinho')

  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
  await loginAs(page, ALICE, '')
  await expect(page).toHaveURL('/pagamento')

  await connectWallet(page)
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(page.getByText('Revise antes de confirmar')).toBeVisible()
  await confirmButton(page).click()

  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  await expect(
    page.getByRole('heading', { name: 'Aguardando confirmação' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
    }),
  ).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()

  // Só o que foi comprado sai do carrinho.
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('clique duplo em confirmar cria um único pedido', async ({ page }) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await goToReview(page)

  await confirmButton(page).dblclick()
  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  expect(await ordersOf(page)).toHaveLength(1)
})

test('pagamento recusado preserva o carrinho', async ({ page }) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await setScenario(page, 'payment-rejected')
  await goToReview(page)
  await confirmButton(page).click()

  await expect(
    page.getByRole('heading', { name: 'Pagamento recusado' }),
  ).toBeVisible({ timeout: 10_000 })
  await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
  await expect(
    page.getByRole('link', { name: 'Emerald Ape #042' }),
  ).toBeVisible()
})

test('resposta perdida: tentar de novo recupera o mesmo pedido', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await setScenario(page, 'order-timeout')
  await goToReview(page)

  await confirmButton(page).click()
  await expect(
    page.getByText(/Não recebemos a resposta do servidor/),
  ).toBeVisible()

  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  expect(await ordersOf(page)).toHaveLength(1)
})

test('pedido pendente é recuperado depois de recarregar a página', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await goToReview(page)
  await confirmButton(page).click()
  await expect(
    page.getByRole('heading', { name: 'Aguardando confirmação' }),
  ).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
    }),
  ).toBeVisible({ timeout: 10_000 })
  expect(await ordersOf(page)).toHaveLength(1)
})

// Com o socket no ar, a tela bloqueia antes (ver realtime.spec.ts). Aqui o
// socket cai, a tela não fica sabendo, e quem barra é a revalidação da API.
test('preço alterado depois da revisão exige nova confirmação', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await goToReview(page)

  await callApi(page, '/api/__realtime/connection', {
    method: 'POST',
    body: { offline: true },
  })
  await callApi(page, '/api/__nfts/nft_001', {
    method: 'POST',
    body: { priceEth: '1.50' },
  })
  await confirmButton(page).click()
  await expect(
    page.getByText(/Os valores mudaram desde a revisão/),
  ).toBeVisible()
  await expect(page.getByText(/Novo total: 1.516 ETH/)).toBeVisible()
  expect(await ordersOf(page)).toHaveLength(0)

  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/pedidos\/ord_/)
})

test('carteira que recusa a conexão bloqueia a revisão', async ({ page }) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await setScenario(page, 'wallet-rejected')
  await page.goto('/pagamento')

  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(
    page.getByText('A conexão foi recusada na carteira.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(
    page.getByText('Conecte a carteira para revisar o pedido.'),
  ).toBeVisible()
})

test('pedido de outro usuário não é exibido', async ({ page }) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await goToReview(page)
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/pedidos\/ord_/)
  const orderUrl = page.url()

  await page.getByRole('button', { name: 'Sair' }).click()
  await loginAs(page, BOB)
  await page.goto(orderUrl)
  await expect(page.getByText('Pedido não encontrado')).toBeVisible()
  await expect(page.getByText('Alice Martins')).toHaveCount(0)
})
