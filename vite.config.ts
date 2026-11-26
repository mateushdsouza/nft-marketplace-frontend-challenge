import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

// No build, troca o cookieStore do MSW por uma versão sem tough-cookie/tldts
// (ver src/mocks/msw-cookie-store.ts). Em dev o MSW fica como veio.
function mswWithoutCookieStore(): Plugin {
  const stub = fileURLToPath(
    new URL('./src/mocks/msw-cookie-store.ts', import.meta.url),
  )
  return {
    name: 'msw-without-cookie-store',
    apply: 'build',
    enforce: 'pre',
    resolveId(source, importer) {
      if (
        importer?.replaceAll('\\', '/').includes('/node_modules/msw/') &&
        /(^|\/)cookieStore\.mjs$/.test(source)
      ) {
        return stub
      }
      return null
    },
  }
}

// O bundle do mock é carregado por import dinâmico no main.tsx, então o
// navegador só o descobre depois de baixar e executar o index.js. Este plugin
// põe um <link rel="modulepreload"> no HTML do build: os dois baixam juntos.
function preloadMocks(): Plugin {
  return {
    name: 'preload-mocks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        const chunk = Object.values(bundle ?? {}).find(
          (item) =>
            item.type === 'chunk' &&
            item.facadeModuleId
              ?.replaceAll('\\', '/')
              .endsWith('/src/mocks/browser.ts'),
        )
        if (!chunk) return []
        return [
          {
            tag: 'link',
            attrs: {
              rel: 'modulepreload',
              crossorigin: '',
              href: `/${chunk.fileName}`,
            },
            injectTo: 'head',
          },
        ]
      },
    },
  }
}

export default defineConfig({
  plugins: [
    mswWithoutCookieStore(),
    preloadMocks(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
