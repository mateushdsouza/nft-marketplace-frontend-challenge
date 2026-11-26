import { expect, test, type Page } from '@playwright/test'
import { ALICE, loginAs } from '../support/auth'
import { resetMocks } from '../support/mocks'
import { addToCart } from '../support/shop'

// Regressão visual das quatro telas principais. Os dados são fixos
// (reset + cenário "fast"), as animações ficam paradas e o que muda
// com o tempo (toasts, devtools) é escondido pelo screenshot.css.
// Para atualizar as baselines depois de uma mudança visual intencional:
//   npx playwright test visual --update-snapshots

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

const viewportOptions = {
  animations: 'disabled',
  caret: 'hide',
  stylePath: 'tests/support/screenshot.css',
  maxDiffPixelRatio: 0.01,
} as const

const options = {
  ...viewportOptions,
  fullPage: true,
  stylePath: [
    'tests/support/screenshot.css',
    'tests/support/screenshot-full-page.css',
  ],
} as const

// Espera todas as imagens visíveis terminarem de carregar.
async function waitForImages(page: Page) {
  await page.evaluate(async () => {
    const images = [...document.images]
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true })
              img.addEventListener('error', resolve, { once: true })
            }),
      ),
    )
  })
}

async function settle(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  // Rola até o fim para as imagens com loading="lazy" carregarem.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await waitForImages(page)
  await page.evaluate(() => window.scrollTo(0, 0))
}

test('início', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('main').getByRole('article')).toHaveCount(9)
  await settle(page)
  await expect(page).toHaveScreenshot('inicio.png', options)
  // Primeira tela, como o usuário vê: cabeçalho e, no mobile, a barra inferior.
  await expect(page).toHaveScreenshot('inicio-tela.png', viewportOptions)
})

test('detalhe do NFT', async ({ page }) => {
  await page.goto('/nft/nft_001')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' }),
  ).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('detalhe.png', options)
})

test('carrinho', async ({ page }) => {
  await addToCart(page)
  await page.goto('/carrinho')
  await expect(
    page.getByText('Emerald Ape #042').filter({ visible: true }).first(),
  ).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('carrinho.png', options)
})

test('pagamento', async ({ page }) => {
  await loginAs(page, ALICE)
  await addToCart(page)
  await page.goto('/pagamento')
  await expect(
    page.getByRole('button', { name: 'Conectar carteira' }),
  ).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('pagamento.png', options)
})
