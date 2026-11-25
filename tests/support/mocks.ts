import type { Page } from '@playwright/test'

// O MSW roda dentro do navegador, então o controle dos mocks
// também é feito por requisições disparadas na página.
export async function waitForMocks(page: Page) {
  await page.waitForSelector('html[data-mocks="ready"]', { state: 'attached' })
}

export async function callApi<T = unknown>(
  page: Page,
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<{ status: number; body: T }> {
  await waitForMocks(page)
  return page.evaluate(
    async ({ path, init }) => {
      const response = await fetch(path, {
        method: init?.method ?? 'GET',
        headers: { 'Content-Type': 'application/json', ...init?.headers },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      })
      const text = await response.text()
      return { status: response.status, body: text ? JSON.parse(text) : null }
    },
    { path, init },
  )
}

// O cenário fica salvo no localStorage do mock, então vale também
// para as próximas navegações da página.
export async function setScenario(page: Page, name: string) {
  const { status } = await callApi(page, '/api/__scenario', {
    method: 'POST',
    body: { name },
  })
  if (status !== 200) throw new Error(`Cenário inválido: ${name}`)
}

// Cada teste começa do mesmo estado: banco restaurado e cenário escolhido.
export async function resetMocks(page: Page, scenario = 'fast') {
  await page.goto('/')
  await callApi(page, '/api/__reset', { method: 'POST' })
  await setScenario(page, scenario)
}
