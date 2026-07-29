import { readFileSync } from 'node:fs'
import { defineConfig } from 'astro/config'

// 루트 package.json의 버전을 빌드 타임에 주입한다.
// 번들러 import가 아닌 fs 읽기인 이유: 리포 루트를 모듈 그래프에 넣으면
// 루트 tsconfig(references → @electron-toolkit/tsconfig)까지 해석 대상이 되어
// 루트 node_modules가 없는 CI에서 빌드가 깨진다.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

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
