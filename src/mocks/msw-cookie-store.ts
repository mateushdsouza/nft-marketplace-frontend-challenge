// Substitui o cookieStore interno do MSW no build de produção.
//
// O original usa as bibliotecas tough-cookie e tldts (lista de domínios
// públicos) para guardar cookies criados por respostas simuladas. Este
// backend simulado não cria cookie nenhum (a sessão vai no header
// Authorization), então o original só ocupava ~60 KB comprimidos no bundle e
// tempo de CPU na inicialização. Os cookies do próprio navegador continuam
// chegando aos handlers: o MSW os lê de document.cookie por outro caminho.
//
// Se algum handler passar a responder com Set-Cookie, remova o plugin
// `mswWithoutCookieStore` do vite.config.ts.

export const cookieStore = {
  getCookies(): Array<{ key: string; value: string; toString(): string }> {
    return []
  },
  async setCookie(): Promise<void> {},
}
