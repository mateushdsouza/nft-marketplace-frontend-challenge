import { expect, test } from '@playwright/test'
import { resetMocks, setScenario } from '../support/mocks'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

test('acesso direto pela URL mostra o NFT', async ({ page }) => {
  await page.goto('/nft/nft_001')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' }),
  ).toBeVisible()
  await expect(page.getByText('1.19 ETH').first()).toBeVisible()
  await expect(page.getByText('#0042')).toBeVisible()
})

test('navega do catálogo para o detalhe', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /Neon Vessel #552/ }).click()
  await expect(page).toHaveURL('/nft/nft_003')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Neon Vessel #552' }),
  ).toBeVisible()
})

test('NFT inexistente mostra 404 com caminho de volta', async ({ page }) => {
  await page.goto('/nft/nao-existe')
  await expect(page.getByText('NFT não encontrado')).toBeVisible()
  await page.getByRole('link', { name: 'Explorar o catálogo' }).click()
  await expect(page).toHaveURL('/')
})

test('edição esgotada fica indisponível', async ({ page }) => {
  await page.goto('/nft/nft_003')
  const soldOut = page.getByRole('radio', { name: /^1\/1\s*\(esgotada\)/ })
  await expect(soldOut).toBeDisabled()
  await expect(page.getByRole('radio', { name: '1/10' })).toBeChecked()
})

test('quantidade respeita o estoque da edição', async ({ page }) => {
  await page.goto('/nft/nft_001')
  await page.getByText('1/10', { exact: true }).click()
  await expect(page.getByText('3 disponíveis nesta edição')).toBeVisible()

  const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
  await plus.click()
  await plus.click()
  await expect(page.getByRole('group', { name: 'Quantidade' })).toContainText(
    '3',
  )
  await expect(plus).toBeDisabled()

  // Trocar de edição volta a quantidade para 1.
  await page.getByText('1/50', { exact: true }).click()
  await expect(page.getByRole('group', { name: 'Quantidade' })).toContainText(
    '1',
  )
})

test('falha ao carregar o detalhe permite tentar de novo', async ({ page }) => {
  await setScenario(page, 'server-error')
  await page.goto('/nft/nft_001')
  await expect(
    page.getByText('Não foi possível carregar este NFT'),
  ).toBeVisible({ timeout: 15_000 })

  await setScenario(page, 'fast')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' }),
  ).toBeVisible()
})
