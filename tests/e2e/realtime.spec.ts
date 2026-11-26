import { expect, test, type Page } from '@playwright/test'
import { ALICE, loginAs } from '../support/auth'
import { callApi, resetMocks } from '../support/mocks'
import { addToCart, confirmButton, goToReview, ordersOf } from '../support/shop'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

async function waitForSocket(page: Page, timeout = 5000) {
  await expect(page.locator('html[data-realtime="connected"]')).toBeAttached({
    timeout,
  })
}

// Quantos eventos do socket o app já recebeu (aceitos ou ignorados).
async function receivedEvents(page: Page) {
  const value = await page
    .locator('html')
    .getAttribute('data-realtime-received')
  return Number(value ?? 0)
}

// Reenvia um evento antigo pelo mock e espera o app recebê-lo e a tela
// terminar de desenhar. Só então dá para afirmar que "nada mudou".
async function replay(page: Page, mode: 'duplicate' | 'stale') {
  const before = await receivedEvents(page)
  await callApi(page, '/api/__realtime/replay', {
    method: 'POST',
    body: { mode },
  })
  await expect.poll(() => receivedEvents(page)).toBe(before + 1)
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  )
}

// Mudança feita "por outra pessoa" no mock: chega ao app só pelo socket.
async function changeNft(page: Page, body: Record<string, unknown>) {
  await callApi(page, '/api/__nfts/nft_001', { method: 'POST', body })
}

test('nft.updated chega pelo socket e atualiza o detalhe sem recarregar', async ({
  page,
}) => {
  await page.goto('/nft/nft_001')
  await waitForSocket(page)
  await expect(page.getByText('1.19 ETH').first()).toBeVisible()

  await changeNft(page, { priceEth: '2.50' })
  await expect(page.getByText('2.50 ETH').first()).toBeVisible()
})

test('nft.updated atualiza o card do catálogo', async ({ page }) => {
  await page.goto('/?q=Emerald')
  await waitForSocket(page)
  const card = page.getByRole('link', { name: /Emerald Ape #042/ })
  await expect(card).toContainText('1.19 ETH')

  await changeNft(page, { priceEth: '0.95' })
  await expect(card).toContainText('0.95 ETH')
})

test('carrinho aberto avisa a mudança de preço e refaz o resumo', async ({
  page,
}) => {
  await addToCart(page)
  await page.goto('/carrinho')
  await waitForSocket(page)
  const summary = page.getByRole('region', { name: 'Resumo da carteira' })
  await expect(summary).toContainText('1.19 ETH')

  await changeNft(page, { priceEth: '2.00' })
  await expect(
    page.getByText(
      'O preço de Emerald Ape #042 mudou de 1.19 ETH para 2.00 ETH.',
    ),
  ).toBeVisible()
  await expect(summary).toContainText('2.00 ETH')
})

test('carrinho aberto avisa quando a edição esgota', async ({ page }) => {
  await addToCart(page)
  await page.goto('/carrinho')
  await waitForSocket(page)

  await changeNft(page, { editionId: 'nft_001_1-50', available: 0 })
  await expect(page.getByText('Emerald Ape #042 (1/50) esgotou.')).toBeVisible()
})

test('checkout bloqueia a confirmação com cotação desatualizada', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await goToReview(page)
  await waitForSocket(page)
  await expect(confirmButton(page)).toBeEnabled()

  await changeNft(page, { priceEth: '3.00' })
  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Os valores mudaram' })
  await expect(alert).toBeVisible()
  await expect(confirmButton(page)).toBeDisabled()

  await alert.getByRole('button', { name: 'Revisar com o novo valor' }).click()
  await expect(alert).toHaveCount(0)
  await expect(confirmButton(page)).toBeEnabled()
  await confirmButton(page).click()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
    }),
  ).toBeVisible()
  await expect(page.getByText('3.00 ETH').first()).toBeVisible()
})

test('evento duplicado ou antigo não volta o estado nem repete o aviso', async ({
  page,
}) => {
  await addToCart(page)
  await page.goto('/carrinho')
  await waitForSocket(page)

  await changeNft(page, { priceEth: '2.00' })
  await changeNft(page, { priceEth: '3.00' })
  const lastNotice = page.getByText('mudou de 2.00 ETH para 3.00 ETH')
  await expect(lastNotice).toBeVisible()

  // Mesmo evento de novo e o evento anterior (versão menor) chegando atrasado.
  await replay(page, 'duplicate')
  await replay(page, 'stale')

  // O aviso aparece uma vez só, e o resumo continua no preço mais novo.
  await expect(lastNotice).toHaveCount(1)
  await expect(page.getByText('mudou de 3.00 ETH para 2.00 ETH')).toHaveCount(0)

  // Navegação dentro do app (sem recarregar): o mock roda na página, e um
  // reload apagaria o histórico de eventos que o replay reenvia.
  await page
    .getByRole('link', { name: 'Emerald Ape #042' })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL(/\/nft\/nft_001/)
  await replay(page, 'stale')
  await expect(
    page.getByRole('main').getByText('3.00 ETH').first(),
  ).toBeVisible()
  // Se o evento antigo fosse aplicado, o preço voltaria a 2.00 e o anterior a 1.19.
  await expect(page.getByRole('main').getByText('1.19 ETH')).toHaveCount(0)
})

test('conexão cai com pedido pendente e o estado volta sem criar outra compra', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await goToReview(page)
  await waitForSocket(page)

  await callApi(page, '/api/__realtime/connection', {
    method: 'POST',
    body: { offline: true },
  })
  await expect(
    page.locator('html[data-realtime="disconnected"]'),
  ).toBeAttached()

  await confirmButton(page).click()
  await expect(
    page.getByRole('heading', { name: 'Aguardando confirmação' }),
  ).toBeVisible()
  // A API confirma o pedido, mas o aviso não chega: o socket está fora.
  await expect
    .poll(async () => (await ordersOf(page))[0]?.status, { timeout: 10_000 })
    .toBe('confirmed')
  await expect(
    page.getByRole('heading', { name: 'Aguardando confirmação' }),
  ).toBeVisible()

  await callApi(page, '/api/__realtime/connection', {
    method: 'POST',
    body: { offline: false },
  })
  // O cliente tenta reconectar sozinho, com espera crescente entre tentativas.
  await waitForSocket(page, 10_000)
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
    }),
  ).toBeVisible({
    timeout: 5000,
  })
  expect(await ordersOf(page)).toHaveLength(1)
})
