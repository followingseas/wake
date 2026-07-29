import { defineConfig } from 'astro/config'
import pkg from '../package.json' with { type: 'json' }

export default defineConfig({
  site: 'https://followingseas.github.io',
  base: '/wake/',
  i18n: {
    locales: ['ko', 'en'],
    defaultLocale: 'ko',
    routing: { prefixDefaultLocale: false }
  },
  vite: {
    define: { __APP_VERSION__: JSON.stringify(pkg.version) }
  }
})
