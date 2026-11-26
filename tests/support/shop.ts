import { expect, type Page } from '@playwright/test'
import { callApi } from './mocks'

export async function addToCart(
  page: Page,
  nftId = 'nft_001',
  edition = '1/50',
) {
  await page.goto(`/nft/${nftId}`)
  await page.getByText(edition, { exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/adicionado ao carrinho/)).toBeVisible()
}

export async function connectWallet(page: Page) {
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText('Carteira conectada')).toBeVisible()
}

export async function goToReview(page: Page) {
  await page.goto('/pagamento')
  await connectWallet(page)
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(page.getByText('Revise antes de confirmar')).toBeVisible()
}

export const confirmButton = (page: Page) =>
  page.getByRole('button', { name: 'Confirmar compra' })

// Pedidos do usuário logado, consultados direto na API simulada.
export async function ordersOf(page: Page) {
  const token = await page.evaluate(() =>
    localStorage.getItem('kurio:session-token'),
  )
  const { body } = await callApi<{ id: string; status: string }[]>(
    page,
    '/api/orders',
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return body
}
