import { expect, test } from '@playwright/test'
import { ALICE, BOB, expectSignedIn, loginAs } from '../support/auth'
import { callApi, resetMocks } from '../support/mocks'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

test('cadastro valida os campos antes de enviar', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

  const email = page.getByLabel('E-mail')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Digite um e-mail válido.')).toBeVisible()

  await page.getByLabel('Nome de usuário').fill('novo_user')
  await email.fill('novo@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('Senha@123')
  await page.getByLabel('Confirmar senha').fill('Outra@123')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page.getByText('As senhas não conferem.')).toBeVisible()
})

test('cadastro com e-mail existente mostra o conflito no campo', async ({
  page,
}) => {
  await page.goto('/cadastro')
  await page.getByLabel('Nome de usuário').fill('outra_alice')
  await page.getByLabel('E-mail').fill(ALICE.email)
  await page.getByLabel('Senha', { exact: true }).fill('Senha@123')
  await page.getByLabel('Confirmar senha').fill('Senha@123')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

  await expect(
    page.getByText('Este e-mail já está cadastrado. Tente entrar.'),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveAttribute(
    'aria-invalid',
    'true',
  )
})

test('cadastro cria a conta, entra e mantém a sessão após refresh', async ({
  page,
}) => {
  await page.goto('/cadastro')
  await page.getByLabel('Nome de usuário').fill('carol')
  await page.getByLabel('E-mail').fill('carol@example.com')
  await page.getByLabel('Senha', { exact: true }).fill('Senha@123')
  await page.getByLabel('Confirmar senha').fill('Senha@123')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

  await expect(page).toHaveURL('/')
  await expectSignedIn(page)

  await page.reload()
  await expectSignedIn(page)
})

test('login com senha errada mostra erro sem revelar o motivo', async ({
  page,
}) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(ALICE.email)
  await page.getByLabel('Senha', { exact: true }).fill('errada123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'E-mail ou senha incorretos.',
  )
})

test('rota privada leva ao login e volta para ela depois', async ({ page }) => {
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fperfil/)

  await loginAs(page, ALICE, '')
  await expect(page).toHaveURL('/perfil')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Alice Martins')
})

test('logout limpa a sessão e troca de usuário não mostra dados do anterior', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await page.goto('/perfil')
  await expect(page.getByLabel('E-mail')).toHaveValue(ALICE.email)

  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
  // Visitante de novo: Entrar no cabeçalho ou Perfil sem nome na barra mobile.
  await expect(
    page
      .getByRole('banner')
      .getByRole('link', { name: 'Entrar' })
      .or(page.getByRole('link', { name: 'Perfil', exact: true }))
      .filter({ visible: true })
      .first(),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /^Perfil de / })).toHaveCount(0)

  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/entrar/)

  await loginAs(page, BOB, '')
  await expect(page.getByLabel('E-mail')).toHaveValue(BOB.email)
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Bob Ferreira')
})

test('sessão expirada leva ao login preservando o caminho', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await page.goto('/carteiras')
  await callApi(page, '/api/__sessions/expire', { method: 'POST' })

  await page.reload()
  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fcarteiras/)

  await loginAs(page, ALICE, '')
  await expect(page).toHaveURL('/carteiras')
})
