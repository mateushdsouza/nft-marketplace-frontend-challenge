import { expect, type Page } from '@playwright/test'

export const ALICE = { email: 'alice@example.com', password: 'Senha@123' }
export const BOB = { email: 'bob@example.com', password: 'Senha@123' }

// Login pela interface, como o usuário faria.
export async function loginAs(
  page: Page,
  user: { email: string; password: string },
  path = '/entrar',
) {
  if (path) await page.goto(path)
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
}
