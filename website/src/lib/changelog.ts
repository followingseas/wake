import type { CollectionEntry } from 'astro:content'
import { getCollection } from 'astro:content'
import type { Locale } from '../i18n/ui'
import { locales } from '../i18n/ui'

export interface Release {
  version: string
  date: Date
  highlight: string
  /** heading id에 버전을 접두사로 붙인 렌더 결과 */
  html: string
}

/** 엔트리 id는 'ko/0.6.0' 형태다 (content.config.ts 참고). */
function localeOf(entry: CollectionEntry<'changelog'>): string {
  return entry.id.split('/')[0]
}

/** 최신 버전이 앞에 오도록 semver 비교. */
function byVersionDesc(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i]
  }
  return 0
}

/**
 * heading id 앞에 버전을 붙여 문서 안에서 유일하게 만든다.
 *
 * 릴리스 여덟 개가 한 페이지에 모이는데 '새 기능'·'버그 수정'은 여러 릴리스에 반복 등장하고,
 * Astro가 붙이는 자동 id는 파일 단위로만 유일하다. Astro의 heading id 생성은 사용자
 * rehype 플러그인보다 뒤에 실행되므로 플러그인으로는 손댈 수 없어 렌더 결과에서 바꾼다.
 */
function scopeHeadingIds(html: string, version: string): string {
  return html.replace(/<(h[1-6]) id="/g, `<$1 id="v${version}-`)
}

/**
 * 로케일별 릴리스 집합이 어긋나면 빌드를 세운다.
 *
 * 스키마는 파일을 하나씩만 검증하므로, 한쪽 로케일 파일만 추가해도 통과한다. 그러면 반대쪽
 * 페이지에서 그 버전이 조용히 빠진 채 배포된다 — 눈치채기 어려운 종류의 누락이라 여기서 막는다.
 */
function assertLocalesInSync(entries: CollectionEntry<'changelog'>[]): void {
  const versionsByLocale = new Map<string, Set<string>>()
  for (const locale of locales) {
    versionsByLocale.set(locale, new Set())
  }

  for (const entry of entries) {
    versionsByLocale.get(localeOf(entry))?.add(entry.data.version)
  }

  const allVersions = [...new Set(entries.map((entry) => entry.data.version))]
  const missing = locales.flatMap((locale) =>
    allVersions
      .filter((version) => !versionsByLocale.get(locale)?.has(version))
      .map((version) => `${locale}/${version}.md`)
  )

  if (missing.length > 0) {
    throw new Error(
      `변경이력 파일이 로케일별로 짝이 맞지 않습니다. 누락: ${missing.sort().join(', ')}`
    )
  }
}

/** 해당 로케일의 릴리스를 최신순으로 돌려준다. */
export async function loadChangelog(locale: Locale): Promise<Release[]> {
  const entries = await getCollection('changelog')
  assertLocalesInSync(entries)

  return entries
    .filter((entry) => localeOf(entry) === locale)
    .sort((a, b) => byVersionDesc(a.data.version, b.data.version))
    .map((entry) => ({
      ...entry.data,
      html: scopeHeadingIds(entry.rendered?.html ?? '', entry.data.version)
    }))
}
