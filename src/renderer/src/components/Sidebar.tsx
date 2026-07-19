import type { ReactElement, RefObject } from 'react'
import type { ProjectInfo, SessionMeta } from '../../../shared/types'
import { formatRelativeTime, shortenPath } from '../lib/format'

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
  onSelectSession
}: Props): ReactElement {
  const searching = query.trim().length > 0

  return (
    <aside className="sidebar">
      <div className="sidebar__titlebar" aria-hidden="true">
        <span className="sidebar__appname">Claude History</span>
      </div>
      <div className="sidebar__search">
        <input
          ref={searchRef}
          type="search"
          placeholder="세션 검색 (⌘F)"
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
                <span className={`project__chevron${isOpen ? ' is-open' : ''}`}>▸</span>
                <span className="project__name">{project.name}</span>
                <span className="project__count">{project.sessionCount}</span>
              </button>
              {isOpen && project.realPath && (
                <p className="project__path">{shortenPath(project.realPath)}</p>
              )}
              {isOpen && (
                <ul className="session-list">
                  {visible === undefined && <li className="session-list__loading">불러오는 중…</li>}
                  {visible?.map((session) => (
                    <li key={session.id}>
                      <button
                        className={`session${session.id === selectedSessionId ? ' is-selected' : ''}`}
                        onClick={() => onSelectSession(session)}
                      >
                        <span className="session__title">{session.title}</span>
                        <span className="session__meta">
                          {formatRelativeTime(session.updatedAt)} · 메시지 {session.messageCount}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
        {projects.length === 0 && (
          <p className="sidebar__empty">
            ~/.claude/projects 에서
            <br />
            세션을 찾지 못했습니다.
          </p>
        )}
      </nav>
    </aside>
  )
}
