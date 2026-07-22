import type { ReactElement } from 'react'
import { usePrefs } from '../prefs'

// 드래그 영역(-webkit-app-region: drag) 요소의 DOM 자식으로 렌더링해야
// no-drag 카브아웃이 macOS에서 안정적으로 동작한다 (별도 레이어의 fixed 오버레이는 클릭이 창 드래그로 먹힘)
export function SidebarExpand({ onClick }: { onClick: () => void }): ReactElement {
  const { t } = usePrefs()
  return (
    <button
      className="sidebar-expand"
      onClick={onClick}
      title={t('sidebar.expand')}
      aria-label={t('sidebar.expand')}
    >
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <rect
          x="1.5"
          y="2.5"
          width="13"
          height="11"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </button>
  )
}
