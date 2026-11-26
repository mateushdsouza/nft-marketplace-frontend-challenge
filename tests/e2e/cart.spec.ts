import { expect, test, type Page } from '@playwright/test'
import { ALICE, BOB, loginAs } from '../support/auth'
import { resetMocks } from '../support/mocks'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

// Adiciona pela tela de detalhe, como o usuário faria.
async function addFromDetail(
  page: Page,
  nftId: string,
  edition: string,
  quantity = 1,
) {
  await page.goto(`/nft/${nftId}`)
  await page.getByText(edition, { exact: true }).click()
  for (let i = 1; i < quantity; i++) {
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  }
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/adicionado ao carrinho/)).toBeVisible()
}

const summary = (page: Page) =>
  page.getByRole('region', { name: 'Resumo da carteira' })

test('visitante adiciona, altera e remove itens com valores da API', async ({
  page,
}) => {
  await addFromDetail(page, 'nft_001', '1/50', 2)
  await page.goto('/carrinho')

  const item = page
    .getByRole('listitem')
    .filter({ hasText: 'Emerald Ape #042' })
  await expect(item).toContainText('2.38 ETH')
  await expect(summary(page)).toContainText('2.38 ETH')
  // 2.38 + taxa de rede 0.016 (Ethereum)
  await expect(summary(page)).toContainText('2.396 ETH')

  await item.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(item).toContainText('3.57 ETH')
  await expect(summary(page)).toContainText('3.586 ETH')

  await item
    .getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' })
    .click()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('carrinho do visitante continua após refresh', async ({ page }) => {
  await addFromDetail(page, 'nft_002', '1/50')
  await page.goto('/carrinho')
  await expect(
    page.getByRole('link', { name: 'Sage Nomad #009' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('link', { name: 'Sage Nomad #009' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Carrinho, 1 item/ }).first(),
  ).toBeAttached()
})

test('respeita o estoque da edição', async ({ page }) => {
  // nft_001 tem 3 unidades da edição 1/10
  await addFromDetail(page, 'nft_001', '1/10', 3)
  await page.goto('/nft/nft_001')
  await page.getByText('1/10', { exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/só há 3 disponíveis/)).toBeVisible()

  await page.goto('/carrinho')
  const item = page.getByRole('listitem').filter({ hasText: 'Emerald Ape' })
  await expect(
    item.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()
})

test('cupom inválido, expirado e válido', async ({ page }) => {
  await addFromDetail(page, 'nft_001', '1/50')
  await page.goto('/carrinho')
  const coupon = page.getByLabel('Código promocional')

  await coupon.fill('NAOEXISTE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(
    page.getByText('Este código promocional não existe.'),
  ).toBeVisible()
  await expect(coupon).toHaveAttribute('aria-invalid', 'true')

  await coupon.fill('LANCAMENTO')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Este código promocional expirou.')).toBeVisible()

  await coupon.fill('kurio10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  // 10% de 1.19 = 0.119 → total 1.19 - 0.119 + 0.016 = 1.087
  await expect(summary(page)).toContainText('Desconto (KURIO10 · 10%)')
  await expect(summary(page)).toContainText('1.087 ETH')

  await page.getByRole('button', { name: 'Remover cupom KURIO10' }).click()
  await expect(summary(page)).toContainText('1.206 ETH')
})

test('itens do visitante entram no carrinho da conta ao fazer login', async ({
  page,
}) => {
  await addFromDetail(page, 'nft_004', '1/50')
  await loginAs(page, ALICE)
  await page.goto('/carrinho')
  await expect(
    page.getByRole('link', { name: 'Cosmic Bloom #118' }),
  ).toBeVisible()
})

test('carrinho de um usuário não aparece para outro', async ({ page }) => {
  await loginAs(page, ALICE)
  await addFromDetail(page, 'nft_005', '1/50')
  await page.getByRole('button', { name: 'Sair' }).click()

  await loginAs(page, BOB)
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  await expect(page.getByText('Violet Nomad #314')).toHaveCount(0)
})

test('"Comprar" no detalhe leva ao carrinho com o item', async ({ page }) => {
  await page.goto('/nft/nft_006')
  await page.getByRole('button', { name: 'Comprar' }).click()
  await expect(page).toHaveURL('/carrinho')
  await expect(
    page.getByRole('link', { name: 'Ivory Baron #088' }),
  ).toBeVisible()
})

test('esvaziar o carrinho remove o cupom aplicado', async ({ page }) => {
  await addFromDetail(page, 'nft_001', '1/50')
  await page.goto('/carrinho')
  await page.getByLabel('Código promocional').fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(summary(page)).toContainText('Desconto (KURIO10 · 10%)')

  await page
    .getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' })
    .click()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()

  await addFromDetail(page, 'nft_001', '1/50')
  await page.goto('/carrinho')
  await expect(page.getByLabel('Código promocional')).toBeVisible()
  await expect(summary(page)).toContainText('Desconto do lançamento')
  await expect(summary(page)).toContainText('1.206 ETH')
})
