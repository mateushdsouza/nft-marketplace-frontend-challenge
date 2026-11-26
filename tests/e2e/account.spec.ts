import { expect, test, type Page } from '@playwright/test'
import { ALICE, BOB, loginAs } from '../support/auth'
import { resetMocks } from '../support/mocks'

test.beforeEach(async ({ page }) => {
  await resetMocks(page)
})

// PNG 1×1 válido.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const save = (page: Page) =>
  page.getByRole('button', { name: 'Salvar alterações' })

test('perfil valida, mostra conflito da API e salva com persistência', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await page.goto('/perfil')

  const name = page.getByLabel('Nome de exibição')
  await expect(name).toHaveValue('Alice Martins')
  await expect(save(page)).toBeDisabled()

  await name.fill('A')
  await save(page).click()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Use pelo menos 2 caracteres.')).toBeVisible()

  // 409: e-mail de outra conta, erro vindo da API no próprio campo.
  await name.fill('Alice M.')
  await page.getByLabel('E-mail').fill(BOB.email)
  await save(page).click()
  await expect(
    page.getByText('Este e-mail já está em uso por outra conta.'),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveAttribute(
    'aria-invalid',
    'true',
  )

  await page.getByLabel('E-mail').fill(ALICE.email)
  await save(page).click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Alice M.')
})

test('avatar recusa arquivo inválido e salva a foto com prévia', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await page.goto('/perfil')
  const input = page.locator('input[type="file"]')

  await input.setInputFiles({
    name: 'notas.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('não é imagem'),
  })
  await expect(page.getByRole('alert')).toHaveText(
    'Use uma imagem PNG, JPG ou WebP.',
  )

  await input.setInputFiles({
    name: 'grande.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(1024 * 1024 + 1),
  })
  await expect(page.getByRole('alert')).toHaveText(
    'A imagem deve ter no máximo 1 MB.',
  )

  await input.setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: PNG,
  })
  await expect(
    page.getByRole('img', { name: 'Prévia da nova foto' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Salvar foto' }).click()
  await expect(page.getByText('Foto de perfil atualizada.')).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('main').getByRole('img', { name: 'Foto de perfil' }),
  ).toHaveAttribute('src', /^data:image\/png;base64,/)
})

test('troca de senha exige a senha atual correta e vale no próximo login', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await page.goto('/perfil')

  await page.getByLabel('Senha atual').fill('Errada@123')
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha@1')
  await page.getByLabel('Confirmar nova senha').fill('NovaSenha@1')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByText('Senha atual incorreta.').first()).toBeVisible()
  await expect(page.getByLabel('Senha atual')).toHaveAttribute(
    'aria-invalid',
    'true',
  )

  await page.getByLabel('Senha atual').fill(ALICE.password)
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByText('Senha alterada.')).toBeVisible()

  await page.getByRole('button', { name: 'Sair' }).click()
  await loginAs(page, { email: ALICE.email, password: 'NovaSenha@1' })
})

test('carteiras: valida o endereço pela rede, edita e cadastra a secundária', async ({
  page,
}) => {
  await loginAs(page, ALICE)
  await page.goto('/carteiras')

  const primary = page.getByRole('region', { name: 'Carteira principal' })
  await expect(primary.getByText('Cofre da Alice')).toBeVisible()
  await primary
    .getByRole('button', { name: 'Editar carteira principal' })
    .click()
  await primary.getByLabel('Apelido').fill('Cofre principal')
  await primary.getByLabel('Endereço').fill('0x123')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(
    primary.getByText(
      'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.',
    ),
  ).toBeVisible()

  await primary
    .getByLabel('Endereço')
    .fill('0x7A42c1F9d3B6e8A0b5C4d2E1f09a8B7c6D5e19E8')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira atualizada.')).toBeVisible()
  await expect(primary.getByText('Cofre principal')).toBeVisible()

  const secondary = page.getByRole('region', { name: 'Carteira secundária' })
  await secondary
    .getByRole('button', { name: 'Cadastrar carteira secundária' })
    .click()
  await secondary.getByLabel('Apelido').fill('Reserva Solana')
  await secondary.getByLabel('Rede').selectOption('solana')
  // Endereço EVM numa rede Solana: a regra depende da rede escolhida.
  await secondary
    .getByLabel('Endereço')
    .fill('0x7A42c1F9d3B6e8A0b5C4d2E1f09a8B7c6D5e19E8')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(secondary.getByText(/Endereço Solana inválido/)).toBeVisible()

  await secondary
    .getByLabel('Endereço')
    .fill('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira cadastrada.')).toBeVisible()

  await page.reload()
  await expect(primary.getByText('Cofre principal')).toBeVisible()
  await expect(secondary.getByText('Reserva Solana')).toBeVisible()
  await expect(secondary.getByText('Solana', { exact: true })).toBeVisible()
})

test('carteiras e perfil são de cada usuário', async ({ page }) => {
  await loginAs(page, BOB)
  await page.goto('/carteiras')
  await expect(
    page
      .getByRole('region', { name: 'Carteira principal' })
      .getByText('Nenhuma carteira cadastrada neste espaço.'),
  ).toBeVisible()
  await expect(page.getByText('Cofre da Alice')).toHaveCount(0)

  await page.goto('/perfil')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Bob Ferreira')
})
