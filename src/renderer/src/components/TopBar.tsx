import type { ReactElement } from 'react'
import { usePrefs } from '../prefs'

interface Props {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onOpenSearch: () => void
}

/**
 * 창 전체 폭을 가로지르는 타이틀바. macOS에서는 신호등 버튼이 이 위에 겹쳐 뜨므로
 * 왼쪽 여백을 비워 둔다.
 */
export function TopBar({ sidebarCollapsed, onToggleSidebar, onOpenSearch }: Props): ReactElement {
  const { t } = usePrefs()
  const toggleLabel = sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')
  return (
    <header className="topbar">
      <div className="topbar__side">
        <button
          className="topbar__toggle"
          onClick={onToggleSidebar}
          title={toggleLabel}
          aria-label={toggleLabel}
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
        <span className="topbar__appname">Wake</span>
      </div>
      <button className="topbar__search" onClick={onOpenSearch} title={t('search.open')}>
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line
            x1="10.4"
            y1="10.4"
            x2="14"
            y2="14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="topbar__search-label">{t('search.open')}</span>
        <kbd className="topbar__search-key">⌘K</kbd>
      </button>
      <div className="topbar__side" />
    </header>
  )
}
