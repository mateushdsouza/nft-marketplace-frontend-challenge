import { expect, test, type Locator } from '@playwright/test'
import { resetMocks } from '../support/mocks'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

// O anel de foco aparece quando o foco veio do teclado.
async function expectFocusVisible(locator: Locator) {
  await expect(locator).toBeFocused()
  expect(await locator.evaluate((el) => el.matches(':focus-visible'))).toBe(
    true,
  )
  // E existe um indicador desenhado (contorno ou sombra), não só o estado.
  const indicator = await locator.evaluate((el) => {
    const style = getComputedStyle(el)
    return {
      outline: style.outlineStyle !== 'none' && style.outlineWidth !== '0px',
      shadow: style.boxShadow !== 'none',
    }
  })
  expect(indicator.outline || indicator.shadow).toBe(true)
}

test('o primeiro Tab mostra o link para pular ao conteúdo', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('main').getByRole('article').first(),
  ).toBeVisible()

  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expectFocusVisible(skip)
  await expect(skip).toBeInViewport()

  await page.keyboard.press('Enter')
  await expect(page.locator('#conteudo')).toBeFocused()
})

test('do catálogo ao carrinho só com o teclado', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('searchbox')
  await search.focus()
  await page.keyboard.type('Emerald')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/q=Emerald/)

  // Tab a partir da busca até chegar ao card do NFT.
  const card = page.getByRole('link', { name: /Emerald Ape #042/ }).first()
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    if (await card.evaluate((el) => el === document.activeElement)) break
  }
  await expectFocusVisible(card)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/nft\/nft_001/)

  const add = page.getByRole('button', { name: 'Adicionar ao carrinho' })
  await add.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByText('Emerald Ape #042 adicionado ao carrinho.'),
  ).toBeVisible()
})

test('a gaveta de filtros prende o foco e devolve ao fechar', async ({
  page,
}) => {
  // A gaveta existe no layout mobile.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Abrir filtros' })
  await trigger.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Filtros' })
  await expect(dialog).toBeVisible()
  // O foco entra na gaveta e não sai dela com Tab nem Shift+Tab.
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press(i % 5 === 4 ? 'Shift+Tab' : 'Tab')
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('formulário com erro leva o foco ao primeiro campo inválido', async ({
  page,
}) => {
  await page.goto('/entrar')
  const email = page.getByLabel('E-mail')
  await email.focus()
  await page.keyboard.type('nao-e-email')
  await page.keyboard.press('Enter')

  await expect(email).toBeFocused()
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  // A mensagem está ligada ao campo: o leitor de tela lê junto.
  const describedBy = await email.getAttribute('aria-describedby')
  expect(describedBy).toBeTruthy()
  await expect(page.locator(`#${describedBy}`)).toHaveText(
    'Digite um e-mail válido.',
  )

  await page.keyboard.type('@example.com')
  await page.keyboard.press('Tab')
  const password = page.getByLabel('Senha', { exact: true })
  await expect(password).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(password).toHaveAttribute('aria-invalid', 'true')
  await expect(password).toBeFocused()
})
