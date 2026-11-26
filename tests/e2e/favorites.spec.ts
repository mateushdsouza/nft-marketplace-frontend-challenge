import { expect, test, type Page } from '@playwright/test'
import { ALICE, BOB, loginAs } from '../support/auth'
import { resetMocks, setScenario } from '../support/mocks'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

const favoriteButton = (page: Page) =>
  page.getByRole('main').getByRole('button', { name: /^Favorit/ })

test('visitante que tenta favoritar vai para o login e volta ao NFT', async ({
  page,
}) => {
  await page.goto('/nft/nft_001')
  await favoriteButton(page).click()
  await expect(page).toHaveURL(/\/entrar\?redirect=/)

  await loginAs(page, ALICE, '')
  await expect(page).toHaveURL(/\/nft\/nft_001/)
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
})

test('favorito persiste após refresh e é só do usuário que favoritou', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await page.goto('/nft/nft_001')
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')

  await favoriteButton(page).click()
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(favoriteButton(page)).toHaveText('Favoritado')

  await page.reload()
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Sair' }).click()
  await loginAs(page, BOB)
  await page.goto('/nft/nft_001')
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
})

test('falha ao favoritar desfaz a mudança otimista e o retry funciona', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await page.goto('/nft/nft_001')
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')

  await setScenario(page, 'favorite-error')
  await favoriteButton(page).click()
  // Otimista: muda antes da resposta (o mock demora 800 ms para falhar).
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
  // Rollback: a API recusou, o estado volta e o erro é anunciado.
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
  await expect(
    page.getByText(
      'Não foi possível favoritar Emerald Ape #042. Tente de novo.',
    ),
  ).toBeVisible()

  await setScenario(page, 'fast')
  await favoriteButton(page).click()
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
})

test('desfavoritar com falha volta a mostrar o favorito', async ({ page }) => {
  // nft_003 já vem favoritado para a Alice nas fixtures.
  await loginAs(page, ALICE)
  await page.goto('/nft/nft_003')
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')

  await setScenario(page, 'favorite-error')
  await favoriteButton(page).click()
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Não foi possível remover/)).toBeVisible()
})
