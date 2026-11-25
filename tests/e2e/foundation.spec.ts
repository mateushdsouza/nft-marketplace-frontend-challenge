import { expect, test } from '@playwright/test'
import { callApi, resetMocks } from '../support/mocks'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

test('a home abre', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('rota inexistente mostra a página 404', async ({ page }) => {
  await page.goto('/rota-que-nao-existe')
  await expect(
    page.getByRole('heading', { name: 'Página não encontrada' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Voltar para o início' }).click()
  await expect(page).toHaveURL('/')
})

test('API simulada filtra, ordena e pagina o catálogo', async ({ page }) => {
  const { status, body } = await callApi<{
    items: { category: string; priceEth: string }[]
    total: number
    totalPages: number
  }>(page, '/api/nfts?category=musica&sort=price-asc&pageSize=3')

  expect(status).toBe(200)
  expect(body.total).toBeGreaterThan(0)
  expect(body.items.every((n) => n.category === 'musica')).toBe(true)
  const prices = body.items.map((n) => Number(n.priceEth))
  expect(prices).toEqual([...prices].sort((a, b) => a - b))
})

test('API simulada responde 404 e 503 conforme o cenário', async ({ page }) => {
  const missing = await callApi<{ error: { code: string } }>(
    page,
    '/api/nfts/nao-existe',
  )
  expect(missing.status).toBe(404)
  expect(missing.body.error.code).toBe('NOT_FOUND')

  await callApi(page, '/api/__scenario', {
    method: 'POST',
    body: { name: 'server-error' },
  })
  const down = await callApi(page, '/api/nfts')
  expect(down.status).toBe(503)
})
