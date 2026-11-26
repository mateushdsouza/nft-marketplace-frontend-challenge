import { expect, test } from '@playwright/test'
import { callApi, resetMocks } from '../support/mocks'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

test('nft.updated chega pelo socket e atualiza o detalhe sem recarregar', async ({
  page,
}) => {
  await page.goto('/nft/nft_001')
  await expect(page.locator('html[data-realtime="connected"]')).toBeAttached()
  await expect(page.getByText('1.19 ETH').first()).toBeVisible()

  await callApi(page, '/api/__nfts/nft_001', {
    method: 'POST',
    body: { priceEth: '2.50' },
  })
  await expect(page.getByText('2.50 ETH').first()).toBeVisible()
})
