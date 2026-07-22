import {
  useMemo,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type RefObject
} from 'react'
import type { ProjectInfo, SessionMeta } from '../../../shared/types'
import { formatRelativeTime, shortenPath } from '../lib/format'
import { buildGroups } from '../lib/groups'
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
  onSessionMenu: (session: SessionMeta) => void
  onCollapseSidebar: () => void
  onResizeStart: (event: ReactMouseEvent) => void
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

function SessionList({
  items,
  selectedSessionId,
  onSelectSession,
  onSessionMenu
}: {
  items: SessionMeta[] | undefined
  selectedSessionId: string | null
  onSelectSession: (session: SessionMeta) => void
  onSessionMenu: (session: SessionMeta) => void
}): ReactElement {
  const { t } = usePrefs()
  return (
    <ul className="session-list">
      {items === undefined && <li className="session-list__loading">{t('sidebar.loading')}</li>}
      {items?.map((session) => (
        <li key={session.id}>
          <button
            className={`session${session.id === selectedSessionId ? ' is-selected' : ''}`}
            onClick={() => onSelectSession(session)}
            onContextMenu={(event) => {
              event.preventDefault()
              onSessionMenu(session)
            }}
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
  onSessionMenu,
  onCollapseSidebar,
  onResizeStart
}: Props): ReactElement {
  const { t } = usePrefs()
  const searching = query.trim().length > 0
  const groups = useMemo(() => buildGroups(projects), [projects])

  return (
    <aside className="sidebar">
      <div className="sidebar__titlebar">
        <span className="sidebar__appname">Wake</span>
        <button
          className="sidebar__collapse"
          onClick={onCollapseSidebar}
          title={t('sidebar.collapse')}
          aria-label={t('sidebar.collapse')}
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
        {groups.map((group) => {
          const root = group.root
          const rootOpen = searching || expanded.has(root.id)
          const rootSessions = group.synthetic ? [] : sessions[root.id]
          const rootVisible = searching
            ? (rootSessions ?? []).filter((s) => matches(s, query.trim()))
            : rootSessions
          const worktreeEntries = group.worktrees
            .map((wt) => {
              const wtSessions = sessions[wt.id]
              const visible = searching
                ? (wtSessions ?? []).filter((s) => matches(s, query.trim()))
                : wtSessions
              return { wt, visible }
            })
            .filter((entry) => !searching || (entry.visible?.length ?? 0) > 0)
          if (searching && (rootVisible?.length ?? 0) === 0 && worktreeEntries.length === 0) {
            return null
          }
          return (
            <section key={root.id} className="project">
              <button
                className="project__header"
                onClick={() => onToggleProject(root.id)}
                aria-expanded={rootOpen}
              >
                <Chevron open={rootOpen} />
                <span className="project__name">{root.name}</span>
                <span className="project__count">{group.totalSessions}</span>
              </button>
              {rootOpen && root.realPath && (
                <p className="project__path">{shortenPath(root.realPath)}</p>
              )}
              {rootOpen && !group.synthetic && (
                <SessionList
                  items={rootVisible}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={onSelectSession}
                  onSessionMenu={onSessionMenu}
                />
              )}
              {rootOpen &&
                worktreeEntries.map(({ wt, visible }) => {
                  const wtOpen = searching || expanded.has(wt.id)
                  return (
                    <div key={wt.id} className="worktree">
                      <button
                        className="worktree__header"
                        onClick={() => onToggleProject(wt.id)}
                        aria-expanded={wtOpen}
                      >
                        <Chevron open={wtOpen} />
                        <span className="worktree__mark" aria-hidden="true">
                          ⎇
                        </span>
                        <span className="worktree__name">{wt.worktree?.name ?? wt.name}</span>
                        <span className="project__count">{wt.sessionCount}</span>
                      </button>
                      {wtOpen && (
                        <SessionList
                          items={visible}
                          selectedSessionId={selectedSessionId}
                          onSelectSession={onSelectSession}
                          onSessionMenu={onSessionMenu}
                        />
                      )}
                    </div>
                  )
                })}
            </section>
          )
        })}
        {groups.length === 0 && <p className="sidebar__empty">{t('sidebar.empty')}</p>}
      </nav>
      <div className="sidebar__resizer" onMouseDown={onResizeStart} aria-hidden="true" />
    </aside>
  )
}
