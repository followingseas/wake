import type { ReactElement, RefObject } from 'react'
import type { ProjectInfo, SessionMeta } from '../../../shared/types'
import { formatRelativeTime, shortenPath } from '../lib/format'
import { usePrefs } from '../prefs'

interface Props {
  projects: ProjectInfo[]
  sessions: Record<string, SessionMeta[]>
  expanded: Set<string>
  selectedSessionId: string | null
  query: string
  searchRef: RefObject<HTMLInputElement | null>
  onQueryChange: (query: string) => void
  onToggleProject: (projectId: string) => void
  onSelectSession: (session: SessionMeta) => void
  onOpenSettings: () => void
}

function Chevron({ open }: { open: boolean }): ReactElement {
  return (
    <span className={`project__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path
          d="M6 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function matches(session: SessionMeta, query: string): boolean {
  const lowered = query.toLowerCase()
  return (
    session.title.toLowerCase().includes(lowered) ||
    (session.firstPrompt?.toLowerCase().includes(lowered) ?? false)
  )
}

export function Sidebar({
  projects,
  sessions,
  expanded,
  selectedSessionId,
  query,
  searchRef,
  onQueryChange,
  onToggleProject,
  onSelectSession,
  onOpenSettings
}: Props): ReactElement {
  const { t } = usePrefs()
  const searching = query.trim().length > 0

  return (
    <aside className="sidebar">
      <div className="sidebar__titlebar">
        <span className="sidebar__appname">Wake</span>
        <button
          className="sidebar__settings"
          onClick={onOpenSettings}
          title={`${t('sidebar.settings')} (⌘,)`}
          aria-label={t('sidebar.settings')}
        >
          ⚙
        </button>
      </div>
      <div className="sidebar__search">
        <input
          ref={searchRef}
          type="search"
          placeholder={t('sidebar.search')}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          spellCheck={false}
        />
      </div>
      <nav className="sidebar__list">
        {projects.map((project) => {
          const isOpen = searching || expanded.has(project.id)
          const projectSessions = sessions[project.id]
          const visible = searching
            ? (projectSessions ?? []).filter((s) => matches(s, query.trim()))
            : projectSessions
          if (searching && (!visible || visible.length === 0)) return null
          return (
            <section key={project.id} className="project">
              <button
                className="project__header"
                onClick={() => onToggleProject(project.id)}
                aria-expanded={isOpen}
              >
                <Chevron open={isOpen} />
                <span className="project__name">{project.name}</span>
                <span className="project__count">{project.sessionCount}</span>
              </button>
              {isOpen && project.realPath && (
                <p className="project__path">{shortenPath(project.realPath)}</p>
              )}
              {isOpen && (
                <ul className="session-list">
                  {visible === undefined && (
                    <li className="session-list__loading">{t('sidebar.loading')}</li>
                  )}
                  {visible?.map((session) => (
                    <li key={session.id}>
                      <button
                        className={`session${session.id === selectedSessionId ? ' is-selected' : ''}`}
                        onClick={() => onSelectSession(session)}
                      >
                        <span className="session__title">{session.title}</span>
                        <span className="session__meta">
                          {formatRelativeTime(session.updatedAt, t)} ·{' '}
                          {t('session.messages', { n: session.messageCount })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
        {projects.length === 0 && <p className="sidebar__empty">{t('sidebar.empty')}</p>}
      </nav>
    </aside>
  )
}
