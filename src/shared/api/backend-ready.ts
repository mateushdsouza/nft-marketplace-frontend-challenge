// Com os mocks ligados, o "backend" só existe depois que o service worker do
// MSW sobe. O app já desenha a tela (cabeçalho, hero, skeletons) e as chamadas
// à API e ao socket esperam aqui, em vez de a página inteira esperar o mock.

let markReady: () => void = () => {}

export const backendReady = new Promise<void>((resolve) => {
  markReady = resolve
})

export function setBackendReady() {
  markReady()
}
