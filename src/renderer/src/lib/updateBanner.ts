import type { UpdateEvent } from '../../../shared/types'

export type UpdateBannerState =
  /** app.isPackaged 가 false 라 자동 업데이트를 못 쓴다 — 릴리스 페이지로 보낸다 */
  | { mode: 'link'; version: string; url: string }
  /** 새 버전을 찾았고 사용자의 다운로드 승인을 기다린다 */
  | { mode: 'available'; version: string }
  /** 승인했고 첫 진행률을 기다린다. 여기서 끊기는 실패가 가장 흔하다 */
  | { mode: 'requested'; version: string }
  | { mode: 'downloading'; version: string; percent: number }
  | { mode: 'ready'; version: string }
  /** 사용자가 닫았다 — 이번 실행에서는 다시 띄우지 않는다 */
  | { mode: 'dismissed' }

/** 사용자가 승인해서 진행 중인 상태 — 실패하면 알려야 한다 */
function isInFlight(state: UpdateBannerState | null): state is UpdateBannerState & {
  mode: 'requested' | 'downloading'
} {
  return state?.mode === 'requested' || state?.mode === 'downloading'
}

/** electron-updater 이벤트를 배너 상태로 옮긴다 */
export function nextBanner(
  prev: UpdateBannerState | null,
  event: UpdateEvent
): UpdateBannerState | null {
  // 닫기는 "이번 실행에서는 그만" 이라는 뜻이다. 진행률이 계속 오므로 지키지 않으면 되살아난다
  if (prev?.mode === 'dismissed') return prev
  // 링크 배너가 뜬 환경에는 이벤트 리스너가 없다. 두 채널은 공존하지 않는다
  if (prev?.mode === 'link') return prev

  switch (event.type) {
    case 'available':
      // 확인할 때마다 update-available 이 다시 온다. 같은 버전을 이미 받고 있거나 받아 뒀으면
      // 되돌리지 않는다 — 되돌리면 사용자가 처음부터 다시 받아야 하는 줄 안다
      if (prev && prev.mode !== 'available' && prev.version === event.version) return prev
      return { mode: 'available', version: event.version }
    case 'downloading':
      return { mode: 'downloading', version: event.version, percent: event.percent }
    case 'ready':
      return { mode: 'ready', version: event.version }
    case 'error':
      // 승인한 뒤의 실패는 시작 전이든 도중이든 다시 누를 수 있게 되돌린다
      if (isInFlight(prev)) return { mode: 'available', version: prev.version }
      // 설치를 기다리는 업데이트와 아직 답하지 않은 안내는 오류로 지우지 않는다
      return prev?.mode === 'ready' || prev?.mode === 'available' ? prev : null
  }
}

/**
 * 전이 결과로 실패를 판정한다. 승인한 다운로드가 같은 버전의 승인 단계로 되돌아갔다는 것은
 * 끊겼다는 뜻이다. 버전이 달라졌다면 더 새 버전으로 갈아타는 것이지 실패가 아니다.
 * 조건을 nextBanner 와 따로 두면 규칙이 바뀔 때 조용히 어긋난다
 */
export function isDownloadFailure(
  prev: UpdateBannerState | null,
  next: UpdateBannerState | null
): boolean {
  return isInFlight(prev) && next?.mode === 'available' && next.version === prev.version
}
