import {
  useMemo,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type RefObject
} from 'react'
import type { ProjectInfo, SessionMeta } from '../../../shared/types'
import { formatRelativeTime, shortenPath } from '../lib/format'
import { buildGroups } from '../lib/groups'
import { shortcut } from '../lib/platform'
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

/** 폴더 이름이 걸리면 그 안의 세션은 제목과 무관하게 전부 보여준다 */
function folderMatches(project: ProjectInfo, query: string): boolean {
  const lowered = query.toLowerCase()
  return (
    project.name.toLowerCase().includes(lowered) ||
    (project.worktree?.name.toLowerCase().includes(lowered) ?? false)
  )
}

// 목록에 실제로 그릴 세션을 고른다. undefined는 "아직 로딩 중"이라 그대로 흘려보내지만,
// 검색 중에는 기존 동작대로 빈 배열로 바꿔 "결과 없음" 판정에 걸리게 한다.
// 자동 생성 세션 필터는 검색 여부와 무관하게 늘 적용하고, 제목 필터만 folderMatched일 때 건너뛴다.
function visibleSessions(
  list: SessionMeta[] | undefined,
  showAgentSessions: boolean,
  query: string,
  folderMatched: boolean
): SessionMeta[] | undefined {
  if (list === undefined) return query ? [] : undefined
  const kept = showAgentSessions ? list : list.filter((session) => session.origin === 'user')
  return query && !folderMatched ? kept.filter((session) => matches(session, query)) : kept
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
  onResizeStart
}: Props): ReactElement {
  const { t, settings } = usePrefs()
  const searching = query.trim().length > 0
  const trimmedQuery = searching ? query.trim() : ''
  const groups = useMemo(
    () => buildGroups(projects, settings.showAgentSessions),
    [projects, settings.showAgentSessions]
  )

  return (
    <aside className="sidebar">
      <div className="sidebar__search">
        <input
          ref={searchRef}
          type="search"
          placeholder={t('sidebar.search', { find: shortcut('F') })}
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
          // 그룹 루트 이름이 걸리면 워크트리까지 통째로 보여준다
          const groupMatched = searching && folderMatches(root, trimmedQuery)
          const rootVisible = visibleSessions(
            rootSessions,
            settings.showAgentSessions,
            trimmedQuery,
            groupMatched
          )
          const worktreeEntries = group.worktrees
            .map((wt) => ({
              wt,
              visible: visibleSessions(
                sessions[wt.id],
                settings.showAgentSessions,
                trimmedQuery,
                groupMatched || folderMatches(wt, trimmedQuery)
              )
            }))
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
                        <span className="project__count">
                          {settings.showAgentSessions ? wt.sessionCount : wt.userSessionCount}
                        </span>
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
