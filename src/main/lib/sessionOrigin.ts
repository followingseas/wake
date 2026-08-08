import type { SessionOrigin } from '../../shared/types'

/**
 * 세션을 만든 주체를 entrypoint 값으로 판정한다.
 *
 * Claude Code는 SDK로 띄운 헤드리스 세션에 'sdk-cli'·'sdk-py' 같은 sdk- 접두 값을 남기고,
 * 사람이 터미널에서 연 대화에는 'cli'를 남긴다. 필드가 아예 없는 구버전 세션은 'user'로
 * 본다 — 자동 세션을 잘못 노출하는 것보다 사람의 대화를 숨기는 쪽이 더 나쁘다.
 */
export function originFromEntrypoint(entrypoint: string | null | undefined): SessionOrigin {
  return typeof entrypoint === 'string' && entrypoint.startsWith('sdk-') ? 'agent' : 'user'
}
