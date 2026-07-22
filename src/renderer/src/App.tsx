import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement
} from 'react'
import type {
  AppSettings,
  Conversation,
  ProjectInfo,
  SessionMeta,
  UpdateInfo
} from '../../shared/types'

type UpdateBannerState =
  | { mode: 'link'; version: string; url: string }
  | { mode: 'downloading'; version: string; percent: number }
  | { mode: 'ready'; version: string }
import { makeTranslate, resolveLanguage } from './i18n'
import { DEFAULT_SETTINGS, PrefsContext, type Prefs } from './prefs'
import { buildGroups, SYNTHETIC_PREFIX } from './lib/groups'
import { Sidebar } from './components/Sidebar'
import { ConversationView } from './components/ConversationView'
import { ConfirmDialog } from './components/ConfirmDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { SidebarExpand } from './components/SidebarExpand'
import { WakeMark } from './components/WakeMark'

export default function App(): ReactElement {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [sessions, setSessions] = useState<Record<string, SessionMeta[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<SessionMeta | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SessionMeta | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [update, setUpdate] = useState<UpdateBannerState | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const loadedProjects = useRef<Set<string>>(new Set())
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = Number(localStorage.getItem('wake:sidebarWidth'))
    return Number.isFinite(saved) && saved >= 220 && saved <= 560 ? saved : 300
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('wake:sidebarCollapsed') === '1'
  )

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem('wake:sidebarCollapsed', prev ? '0' : '1')
      return !prev
    })
  }, [])

  const startSidebarResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    const clamp = (x: number): number => Math.min(560, Math.max(220, x))
    const onMove = (e: MouseEvent): void => setSidebarWidth(clamp(e.clientX))
    const onUp = (e: MouseEvent): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('is-resizing')
      localStorage.setItem('wake:sidebarWidth', String(clamp(e.clientX)))
    }
    document.body.classList.add('is-resizing')
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const lang = resolveLanguage(settings.language)
  const t = useMemo(() => makeTranslate(lang), [lang])

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const info = await window.api.saveSettings(partial)
    setSettings(info.settings)
  }, [])

  const prefs = useMemo<Prefs>(
    () => ({ settings, lang, t, updateSettings }),
    [settings, lang, t, updateSettings]
  )

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }, [])

  const loadSessions = useCallback(async (projectId: string) => {
    if (projectId.startsWith(SYNTHETIC_PREFIX)) return
    if (loadedProjects.current.has(projectId)) return
    loadedProjects.current.add(projectId)
    const metas = await window.api.listSessions(projectId)
    setSessions((prev) => ({ ...prev, [projectId]: metas }))
    // 시작 시 sessionCount는 파일 수 휴리스틱이라, 실제 목록이 비면 프로젝트를 숨긴다 (삭제 경로와 동일 규칙)
    setProjects((prev) =>
      prev
        .map((p) => (p.id === projectId ? { ...p, sessionCount: metas.length } : p))
        .filter((p) => p.sessionCount > 0)
    )
  }, [])

  useEffect(() => {
    // electron-updater 이벤트(다운로드 진행·완료)가 배너 상태를 구동한다
    const unsubscribe = window.api.onUpdateEvent((event) => {
      if (event.type === 'downloading') {
        setUpdate({ mode: 'downloading', version: event.version, percent: event.percent })
      } else if (event.type === 'ready') {
        setUpdate({ mode: 'ready', version: event.version })
      } else if (event.type === 'error') {
        setUpdate((prev) => (prev?.mode === 'ready' ? prev : null))
      }
    })
    window.api.getSettings().then((info) => {
      setSettings(info.settings)
      if (info.settings.checkUpdatesOnLaunch) {
        window.api.checkForUpdate().then((updateInfo: UpdateInfo) => {
          // auto 모드는 이벤트가 배너를 그리므로 링크 배너는 legacy(dev) 경로에서만 띄운다
          if (updateInfo.hasUpdate && !updateInfo.auto && updateInfo.latestVersion) {
            setUpdate({ mode: 'link', version: updateInfo.latestVersion, url: updateInfo.url })
          }
        })
      }
    })
    window.api.listProjects().then((list) => {
      setProjects(list)
      // 최상위는 그룹 단위이므로 첫 그룹의 루트를 펼친다
      const first = buildGroups(list)[0]
      if (first) {
        setExpanded(new Set([first.root.id]))
        loadSessions(first.root.id)
      }
    })
    return unsubscribe
  }, [loadSessions])

  // 애플리케이션 메뉴(wake > 설정…)에서 설정 열기
  useEffect(() => window.api.onOpenSettings(() => setShowSettings(true)), [])

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
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault()
        setShowSettings(true)
      }
      if (event.key === 'Escape') {
        setShowSettings(false)
        setDeleteTarget(null)
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

  const openSessionMenu = useCallback(
    async (session: SessionMeta) => {
      const choice = await window.api.showSessionMenu({
        reveal: t('menu.reveal'),
        delete: t('menu.delete')
      })
      if (choice === 'reveal') window.api.revealSession(session.filePath)
      else if (choice === 'delete') setDeleteTarget(session)
    },
    [t]
  )

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
        showToast(kind === 'resume' ? t('toast.resume') : t('toast.fork'))
      } else {
        showToast(t('toast.actionFailed', { error: result.error ?? t('toast.unknownError') }))
      }
    },
    [selected, selectedProject, showToast, t]
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    const result = await window.api.deleteSession(target.filePath)
    if (!result.ok) {
      showToast(t('toast.deleteFailed', { error: result.error ?? t('toast.unknownError') }))
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
    showToast(t('toast.deleted'))
  }, [deleteTarget, selected, showToast, t])

  return (
    <PrefsContext.Provider value={prefs}>
      <div
        className={`app${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}
        data-font-scale={settings.fontScale}
        style={{ '--sidebar-width': `${sidebarCollapsed ? 0 : sidebarWidth}px` } as CSSProperties}
      >
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
          onSessionMenu={openSessionMenu}
          onCollapseSidebar={toggleSidebar}
          onResizeStart={startSidebarResize}
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
            onExpandSidebar={sidebarCollapsed ? toggleSidebar : null}
          />
        ) : (
          <main className="conversation conversation--empty">
            {sidebarCollapsed && <SidebarExpand onClick={toggleSidebar} />}
            <div className="empty-state">
              <div className="empty-state__mark">
                <WakeMark size={84} />
              </div>
              <p>{t('empty.title')}</p>
              <p className="empty-state__hint">{t('empty.hint')}</p>
            </div>
          </main>
        )}
        {deleteTarget && (
          <ConfirmDialog
            title={t('delete.title')}
            body={t('delete.body', { title: deleteTarget.title })}
            confirmLabel={t('delete.confirm')}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
        {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
        {update && (
          <div className="update-banner" role="status">
            <span className="update-banner__text">
              {update.mode === 'link' && t('update.banner', { v: `v${update.version}` })}
              {update.mode === 'downloading' &&
                t('update.downloading', { v: `v${update.version}`, p: update.percent })}
              {update.mode === 'ready' && t('update.ready', { v: `v${update.version}` })}
            </span>
            {update.mode === 'link' && (
              <button
                className="btn btn--primary"
                onClick={() => {
                  window.api.openExternal(update.url)
                  setUpdate(null)
                }}
              >
                {t('update.download')}
              </button>
            )}
            {update.mode === 'ready' && (
              <button className="btn btn--primary" onClick={() => window.api.installUpdate()}>
                {t('update.restart')}
              </button>
            )}
            <button
              className="update-banner__close"
              onClick={() => setUpdate(null)}
              aria-label={t('common.close')}
            >
              ×
            </button>
          </div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </PrefsContext.Provider>
  )
}
