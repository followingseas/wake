import type { ReactElement } from 'react'
import type { Conversation, ProjectInfo, SessionMeta } from '../../../shared/types'
import { formatBytes, formatFullDate, shortenPath } from '../lib/format'
import { AssistantTurn, UserMessage } from './MessageItems'

interface Props {
  session: SessionMeta
  project: ProjectInfo | null
  conversation: Conversation | null
  loading: boolean
  onResume: () => void
  onFork: () => void
  onDelete: () => void
  onReveal: () => void
}

export function ConversationView({
  session,
  project,
  conversation,
  loading,
  onResume,
  onFork,
  onDelete,
  onReveal
}: Props): ReactElement {
  const cwd = session.cwd ?? project?.realPath ?? null
  return (
    <main className="conversation">
      <header className="conversation__header">
        <div className="conversation__heading">
          <h1 title={session.title}>{session.title}</h1>
          <p className="conversation__meta">
            {cwd && <span>{shortenPath(cwd)}</span>}
            {session.gitBranch && <span className="conversation__branch">{session.gitBranch}</span>}
            <span>{formatFullDate(session.updatedAt)}</span>
            <span>메시지 {session.messageCount}</span>
            <span>{formatBytes(session.fileSize)}</span>
            {conversation && conversation.sidechainCount > 0 && (
              <span>서브에이전트 {conversation.sidechainCount}건 숨김</span>
            )}
          </p>
        </div>
        <div className="conversation__actions">
          <button
            className="btn btn--primary"
            onClick={onResume}
            title="터미널에서 이 세션을 이어서 연다"
          >
            터미널에서 이어가기
          </button>
          <button className="btn" onClick={onFork} title="새 세션 ID로 분기해 연다">
            Fork로 열기
          </button>
          <button className="btn" onClick={onReveal} title="Finder에서 세션 파일 표시">
            Finder
          </button>
          <button className="btn btn--danger" onClick={onDelete}>
            삭제
          </button>
        </div>
      </header>
      <div className="conversation__scroll">
        {loading && <p className="conversation__status">대화를 불러오는 중…</p>}
        {!loading && conversation && conversation.items.length === 0 && (
          <p className="conversation__status">표시할 메시지가 없습니다.</p>
        )}
        {!loading && conversation && (
          <div className="timeline">
            {conversation.items.map((item) =>
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
