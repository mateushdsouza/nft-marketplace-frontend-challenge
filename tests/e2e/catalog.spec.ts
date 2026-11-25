import { expect, test, type Page } from '@playwright/test'
import { resetMocks, setScenario } from '../support/mocks'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

const cards = (page: Page) =>
  page.getByRole('main').getByRole('article').getByRole('heading')

// No mobile os filtros ficam numa gaveta (Sheet).
async function openFilters(page: Page) {
  await expect(page.getByRole('searchbox')).toBeVisible()
  const trigger = page.getByRole('button', { name: 'Abrir filtros' })
  if (await trigger.isVisible()) await trigger.click()
}

test('filtros combinados ficam na URL e sobrevivem a refresh e histórico', async ({
  page,
}) => {
  await page.goto('/')
  await expect(cards(page).first()).toBeVisible()

  await openFilters(page)
  await page.getByRole('button', { name: /^Música/ }).click()
  await expect(page).toHaveURL(/category=musica/)

  await page.getByRole('button', { name: /^Polygon/ }).click()
  await expect(page).toHaveURL(/category=musica/)
  await expect(page).toHaveURL(/network=polygon/)
  await expect(page.getByRole('button', { name: /^Música/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.reload()
  await openFilters(page)
  await expect(page.getByRole('button', { name: /^Polygon/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await page.goBack()
  await expect(page).not.toHaveURL(/network=/)
  await expect(page).toHaveURL(/category=musica/)
})

test('mudar filtro volta para a página 1 e o histórico restaura a página', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(
    page
      .getByRole('navigation', { name: 'Paginação' })
      .locator('[aria-current="page"]'),
  ).toHaveText(/2/)

  await page.getByRole('button', { name: 'Em alta' }).click()
  await expect(page).toHaveURL(/tab=trending/)
  await expect(page).not.toHaveURL(/page=/)

  await page.goBack()
  await expect(page).toHaveURL(/page=2/)
  await expect(page).not.toHaveURL(/tab=/)
})

test('busca com debounce e ordenação por preço', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox').fill('Emerald')
  await expect(page).toHaveURL(/q=Emerald/)
  await expect(cards(page)).toHaveText(['Emerald Ape #042'])

  await page.getByRole('searchbox').fill('')
  await expect(page).not.toHaveURL(/q=/)

  await page.getByLabel('Ordenar por:').selectOption('price-asc')
  await expect(page).toHaveURL(/sort=price-asc/)
  const prices = page
    .getByRole('main')
    .getByRole('article')
    .locator('.text-text-accent')
  await expect(prices).toHaveCount(9)
  const values = (await prices.allTextContents()).map((t) =>
    Number.parseFloat(t),
  )
  expect(values).toEqual([...values].sort((a, b) => a - b))
})

test('resultado vazio oferece limpar a busca', async ({ page }) => {
  await page.goto('/?q=nada-com-esse-nome')
  await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar busca e filtros' }).click()
  await expect(page).toHaveURL('/')
  await expect(cards(page)).toHaveCount(9)
})

test('falha na API mostra erro e o retry recupera a lista', async ({
  page,
}) => {
  await setScenario(page, 'server-error')
  await page.goto('/')
  await expect(page.getByText('Não foi possível carregar os NFTs')).toBeVisible(
    { timeout: 15_000 },
  )

  await setScenario(page, 'fast')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(cards(page)).toHaveCount(9)
})

test('carregamento lento mostra skeleton com as dimensões do card', async ({
  page,
}) => {
  await setScenario(page, 'slow')
  await page.goto('/')
  await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
  await expect(page.getByText('Carregando NFTs…')).toBeVisible()
  await expect(cards(page).first()).toBeVisible({ timeout: 10_000 })
})

test('home sem rolagem horizontal, inclusive nas abas', async ({ page }) => {
  await page.goto('/')
  await expect(cards(page).first()).toBeVisible()
  const pageOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
  expect(pageOverflow).toBe(0)
  const tabsOverflow = await page
    .getByRole('group', { name: 'Listas' })
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(tabsOverflow).toBe(0)
})
