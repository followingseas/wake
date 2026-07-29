import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://followingseas.github.io',
  base: '/wake/',
  i18n: {
    locales: ['ko', 'en'],
    defaultLocale: 'ko',
    routing: { prefixDefaultLocale: false }
  }
})
