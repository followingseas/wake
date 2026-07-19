import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import type { Conversation, ProjectInfo, SessionMeta } from '../../shared/types'
import { Sidebar } from './components/Sidebar'
import { ConversationView } from './components/ConversationView'
import { ConfirmDialog } from './components/ConfirmDialog'
import { SettingsDialog } from './components/SettingsDialog'

export default function App(): ReactElement {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [sessions, setSessions] = useState<Record<string, SessionMeta[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<SessionMeta | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SessionMeta | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const loadedProjects = useRef<Set<string>>(new Set())

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }, [])

  const loadSessions = useCallback(async (projectId: string) => {
    if (loadedProjects.current.has(projectId)) return
    loadedProjects.current.add(projectId)
    const metas = await window.api.listSessions(projectId)
    setSessions((prev) => ({ ...prev, [projectId]: metas }))
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, sessionCount: metas.length } : p))
    )
  }, [])

  useEffect(() => {
    window.api.listProjects().then((list) => {
      setProjects(list)
      if (list.length > 0) {
        setExpanded(new Set([list[0].id]))
        loadSessions(list[0].id)
      }
    })
  }, [loadSessions])

  // 검색 시 아직 안 읽은 프로젝트의 세션 메타를 모두 로드한다
  useEffect(() => {
    if (!query.trim()) return
    for (const project of projects) loadSessions(project.id)
  }, [query, projects, loadSessions])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleProject = useCallback(
    (projectId: string) => {
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(projectId)) next.delete(projectId)
        else {
          next.add(projectId)
          loadSessions(projectId)
        }
        return next
      })
    },
    [loadSessions]
  )

  const selectSession = useCallback(async (session: SessionMeta) => {
    setSelected(session)
    setConversation(null)
    setLoadingConversation(true)
    try {
      const loaded = await window.api.loadConversation(session.filePath)
      setConversation(loaded)
    } finally {
      setLoadingConversation(false)
    }
  }, [])

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selected?.projectId) ?? null,
    [projects, selected]
  )

  const runAction = useCallback(
    async (kind: 'resume' | 'fork') => {
      if (!selected) return
      const cwd = selected.cwd ?? selectedProject?.realPath ?? null
      const action = kind === 'resume' ? window.api.resumeSession : window.api.forkSession
      const result = await action(selected.id, cwd)
      if (result.ok) {
        showToast(kind === 'resume' ? '터미널에서 세션을 엽니다' : '터미널에서 fork 세션을 엽니다')
      } else {
        showToast(`실행 실패: ${result.error ?? '알 수 없는 오류'}`)
      }
    },
    [selected, selectedProject, showToast]
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    const result = await window.api.deleteSession(target.filePath)
    if (!result.ok) {
      showToast(`삭제 실패: ${result.error ?? '알 수 없는 오류'}`)
      return
    }
    loadedProjects.current.delete(target.projectId)
    const metas = await window.api.listSessions(target.projectId)
    loadedProjects.current.add(target.projectId)
    setSessions((prev) => ({ ...prev, [target.projectId]: metas }))
    setProjects((prev) =>
      prev
        .map((p) => (p.id === target.projectId ? { ...p, sessionCount: metas.length } : p))
        .filter((p) => p.sessionCount > 0)
    )
    if (selected?.id === target.id) {
      setSelected(null)
      setConversation(null)
    }
    showToast('세션을 휴지통으로 이동했습니다')
  }, [deleteTarget, selected, showToast])

  return (
    <div className="app">
      <Sidebar
        projects={projects}
        sessions={sessions}
        expanded={expanded}
        selectedSessionId={selected?.id ?? null}
        query={query}
        searchRef={searchRef}
        onQueryChange={setQuery}
        onToggleProject={toggleProject}
        onSelectSession={selectSession}
        onOpenSettings={() => setShowSettings(true)}
      />
      {selected ? (
        <ConversationView
          session={selected}
          project={selectedProject}
          conversation={conversation}
          loading={loadingConversation}
          onResume={() => runAction('resume')}
          onFork={() => runAction('fork')}
          onDelete={() => setDeleteTarget(selected)}
          onReveal={() => window.api.revealSession(selected.filePath)}
        />
      ) : (
        <main className="conversation conversation--empty">
          <div className="empty-state">
            <p className="empty-state__mark">❯</p>
            <p>왼쪽에서 세션을 선택하세요</p>
            <p className="empty-state__hint">⌘F 검색 · 클릭으로 열람</p>
          </div>
        </main>
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="세션 삭제"
          body={`"${deleteTarget.title}" 세션 파일을 휴지통으로 이동합니다. 휴지통에서 복구할 수 있습니다.`}
          confirmLabel="휴지통으로 이동"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {showSettings && (
        <SettingsDialog
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false)
            showToast('설정을 저장했습니다')
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
