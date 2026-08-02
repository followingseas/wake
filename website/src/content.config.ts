import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

// 변경이력 컬렉션. 로케일별 하위 디렉토리에 릴리스 하나당 파일 하나를 둔다:
//   src/content/changelog/ko/0.6.0.md
//   src/content/changelog/en/0.6.0.md
// 따라서 엔트리 id는 'ko/0.6.0' 형태이며, 로케일 필터는 id 접두사로 한다
// (getChangelog 헬퍼 참고).
//
// 릴리스를 낼 때마다 ko/en 두 파일을 함께 추가한다. 빠뜨려도 빌드는 통과하고
// 해당 버전이 조용히 누락되므로, GitHub 릴리스 노트를 쓸 때 같이 챙긴다.
// 릴리스 노트의 설치 안내와 'Full Changelog' 링크는 여기에 옮기지 않는다 —
// 페이지가 버전마다 GitHub 릴리스 링크를 따로 걸어준다.
const changelog = defineCollection({
  loader: glob({ base: './src/content/changelog', pattern: '**/*.md' }),
  schema: z.object({
    /** 태그의 v를 뺀 semver. 예: '0.6.0' */
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    /** 릴리스 발행일 (KST 기준) */
    date: z.coerce.date(),
    /** 타임라인에서 버전 제목 아래 놓이는 한 줄 요약 */
    highlight: z.string()
  })
})

export const collections = { changelog }
