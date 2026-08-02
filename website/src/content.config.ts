import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

// 변경이력 컬렉션. 로케일별 하위 디렉토리에 릴리스 하나당 파일 하나를 둔다:
//   src/content/changelog/ko/0.6.0.md
//   src/content/changelog/en/0.6.0.md
// 엔트리 id는 확장자를 뗀 경로('ko/0.6.0')이고, 로케일 필터는 id 접두사로 한다
// (lib/changelog.ts 참고).
//
// 릴리스를 낼 때마다 ko/en 두 파일을 함께 추가한다. 한쪽만 추가하면 loadChangelog가
// 빌드를 세우므로 조용히 누락되지는 않는다.
// 릴리스 노트의 설치 안내와 'Full Changelog' 링크는 여기에 옮기지 않는다 —
// 페이지가 버전마다 GitHub 릴리스 링크를 따로 걸어준다.
const changelog = defineCollection({
  loader: glob({
    base: './src/content/changelog',
    pattern: '**/*.md',
    // 기본 generateId는 파일명을 slug로 바꿔 '0.4.1'을 '041'로 만든다.
    // 스키마 오류 메시지가 실제 파일을 가리키도록 경로를 그대로 쓴다.
    generateId: ({ entry }) => entry.replace(/\.md$/, '')
  }),
  schema: z.object({
    /** 태그의 v를 뺀 semver. 예: '0.6.0' */
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    /**
     * 릴리스 발행일 (KST 기준). `date: '2026-07-24'`처럼 **따옴표로 감싼** 날짜만 받는다.
     *
     * 따옴표를 빼면 YAML이 날짜 리터럴을 타임스탬프로 해석해 Date 객체가 넘어오고,
     * `2026-07-19T00:30:00+09:00` 같은 값은 UTC로 환산되며 표시가 하루 밀린다.
     * 문자열로 받아 UTC 자정으로 고정하면 빌드 머신의 타임존과 무관해진다.
     */
    date: z
      .string("date는 따옴표로 감싼 'YYYY-MM-DD' 문자열이어야 합니다")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date는 'YYYY-MM-DD' 형식이어야 합니다")
      .transform((value) => new Date(`${value}T00:00:00Z`)),
    /** 타임라인에서 버전 제목 아래 놓이는 한 줄 요약 */
    highlight: z.string()
  })
})

export const collections = { changelog }
