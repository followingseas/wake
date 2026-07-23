import type { ReactElement } from 'react'
import type { Conversation, ProjectInfo, SessionMeta, UserMetaInfo } from '../../../shared/types'
import { formatBytes, formatFullDate, shortenPath } from '../lib/format'
import { usePrefs } from '../prefs'
import { AssistantTurn, UserMessage } from './MessageItems'
import { SidebarExpand } from './SidebarExpand'

// 사용자 액션(! 셸 명령, Esc 중단)과 세션 경계는 시스템 메시지 숨김과 무관하게 항상 보여준다
const ALWAYS_VISIBLE_META = new Set<UserMetaInfo['kind']>(['bashRun', 'interrupt', 'compact'])

interface Props {
  session: SessionMeta
  project: ProjectInfo | null
  conversation: Conversation | null
  loading: boolean
  onResume: () => void
  onFork: () => void
  onDelete: () => void
  onReveal: () => void
  onExpandSidebar: (() => void) | null
}

export function ConversationView({
  session,
  project,
  conversation,
  loading,
  onResume,
  onFork,
  onDelete,
  onReveal,
  onExpandSidebar
}: Props): ReactElement {
  const { t, settings } = usePrefs()
  const cwd = session.cwd ?? project?.realPath ?? null
  const items = conversation
    ? conversation.items.filter(
        (item) =>
          settings.showMeta ||
          item.kind !== 'user' ||
          item.meta === null ||
          ALWAYS_VISIBLE_META.has(item.meta.kind)
      )
    : []
  return (
    <main className="conversation">
      <header className="conversation__header">
        {onExpandSidebar && <SidebarExpand onClick={onExpandSidebar} />}
        <div className="conversation__heading">
          <h1 title={session.title}>{session.title}</h1>
          <p className="conversation__meta">
            {cwd && <span>{shortenPath(cwd)}</span>}
            {session.gitBranch && <span className="conversation__branch">{session.gitBranch}</span>}
            <span>{formatFullDate(session.updatedAt)}</span>
            <span>{t('session.messages', { n: session.messageCount })}</span>
            <span>{formatBytes(session.fileSize)}</span>
            {conversation && conversation.sidechainCount > 0 && (
              <span>{t('header.subagentHidden', { n: conversation.sidechainCount })}</span>
            )}
          </p>
        </div>
        <div className="conversation__actions">
          <button className="btn btn--primary" onClick={onResume} title={t('action.resume.hint')}>
            {t('action.resume')}
          </button>
          <button className="btn" onClick={onFork} title={t('action.fork.hint')}>
            {t('action.fork')}
          </button>
          <button className="btn" onClick={onReveal} title={t('action.reveal.hint')}>
            {t('action.reveal')}
          </button>
          <button className="btn btn--danger" onClick={onDelete}>
            {t('action.delete')}
          </button>
        </div>
      </header>
      <div className="conversation__scroll">
        {loading && <p className="conversation__status">{t('conversation.loading')}</p>}
        {!loading && conversation && items.length === 0 && (
          <p className="conversation__status">{t('conversation.empty')}</p>
        )}
        {!loading && conversation && (
          <div className="timeline">
            {items.map((item) =>
              item.kind === 'user' ? (
                <UserMessage key={item.uuid} item={item} />
              ) : (
                <AssistantTurn key={item.uuid} item={item} />
              )
            )}
          </div>
        )}
      </div>
    </main>
  )
}
