import type { UpdateEvent } from '../../../shared/types'

export type UpdateBannerState =
  /** dev 등 자동 업데이트를 못 쓰는 환경 — 릴리스 페이지로 보낸다 */
  | { mode: 'link'; version: string; url: string }
  /** 새 버전을 찾았고 사용자의 다운로드 승인을 기다린다 */
  | { mode: 'available'; version: string }
  | { mode: 'downloading'; version: string; percent: number }
  | { mode: 'ready'; version: string }

/** electron-updater 이벤트를 배너 상태로 옮긴다 */
export function nextBanner(
  prev: UpdateBannerState | null,
  event: UpdateEvent
): UpdateBannerState | null {
  switch (event.type) {
    case 'available':
      return { mode: 'available', version: event.version }
    case 'downloading':
      return { mode: 'downloading', version: event.version, percent: event.percent }
    case 'ready':
      return { mode: 'ready', version: event.version }
    case 'error':
      // 사용자가 승인해 받던 중이었다면 다시 누를 수 있게 승인 단계로 되돌린다
      if (prev?.mode === 'downloading') return { mode: 'available', version: prev.version }
      // 설치를 기다리는 업데이트와 아직 답하지 않은 안내는 오류로 지우지 않는다
      return prev?.mode === 'ready' || prev?.mode === 'available' ? prev : null
  }
}
