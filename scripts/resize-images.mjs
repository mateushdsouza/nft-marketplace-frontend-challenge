// Gera versões menores das artes (public/nfts/nft-NN.webp → nft-NN-400.webp)
// para o srcset dos cards. Usa o Chromium do Playwright (canvas → WebP), então
// não precisa de nenhuma biblioteca de imagem a mais.
//
// Uso: node scripts/resize-images.mjs   (rodar de novo só se as artes mudarem)

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const DIR = 'public/nfts'
const WIDTH = 400
const QUALITY = 0.82

const browser = await chromium.launch()
const page = await browser.newPage()

for (const file of readdirSync(DIR).filter((f) => /^nft-\d+\.webp$/.test(f))) {
  const source = readFileSync(join(DIR, file)).toString('base64')
  const output = await page.evaluate(
    async ({ source, width, quality }) => {
      const img = new Image()
      img.src = 'data:image/webp;base64,' + source
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = Math.round((img.height / img.width) * width)
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/webp', quality).split(',')[1]
    },
    { source, width: WIDTH, quality: QUALITY },
  )
  const target = file.replace('.webp', `-${WIDTH}.webp`)
  writeFileSync(join(DIR, target), Buffer.from(output, 'base64'))
  console.log(`${file} → ${target}`)
}

await browser.close()
