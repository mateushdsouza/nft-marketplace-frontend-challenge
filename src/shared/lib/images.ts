// As artes existem em 800 px (nft-NN.webp) e 400 px (nft-NN-400.webp, gerada
// por scripts/resize-images.mjs). Com srcset, o navegador baixa a menor que
// atende ao tamanho exibido e à densidade da tela.
export function artSrcSet(src: string): string | undefined {
  if (!/^\/nfts\/nft-\d+\.webp$/.test(src)) return undefined
  return `${src.replace('.webp', '-400.webp')} 400w, ${src} 800w`
}
