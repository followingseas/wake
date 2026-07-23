import { useState, type ReactElement } from 'react'
import type { ConversationItem } from '../../../shared/types'
import { formatClock } from '../lib/format'
import { usePrefs } from '../prefs'
import { Markdown } from './Markdown'
import { ToolCallCard } from './ToolCallCard'

type UserItem = Extract<ConversationItem, { kind: 'user' }>
type AssistantItem = Extract<ConversationItem, { kind: 'assistant' }>

function MetaLine({ item }: { item: UserItem }): ReactElement {
  const { t } = usePrefs()
  const [open, setOpen] = useState(false)
  const meta = item.meta
  const detail = meta?.detail ?? null
  const label =
    meta?.kind === 'output'
      ? t('meta.output')
      : meta?.kind === 'context'
        ? t('meta.context')
        : meta?.kind === 'bashOutput'
          ? t('meta.bashOutput')
          : meta?.kind === 'task'
            ? meta.label
              ? `${t('meta.task')} · ${meta.label}`
              : t('meta.task')
            : (meta?.label ?? '')
  return (
    <div className="meta-line">
      <button
        className="meta-line__row"
        onClick={() => detail && setOpen((v) => !v)}
        disabled={!detail}
      >
        <span className="meta-line__mark">·</span>
        <span className="meta-line__label">{label}</span>
      </button>
      {open && detail && <pre className="meta-line__detail">{detail}</pre>}
    </div>
  )
}

/** ! 접두사로 직접 실행한 셸 명령 — 사용자 액션이므로 우측에 터미널 칩으로 표시 */
function BashRun({ item }: { item: UserItem }): ReactElement {
  const { t } = usePrefs()
  const [open, setOpen] = useState(false)
  const output = item.meta?.detail || null
  const clock = formatClock(item.timestamp)
  return (
    <article className="user-message user-message--bash">
      {clock && <time className="item-clock">{clock}</time>}
      <div className="bash-run">
        <button
          className="bash-run__row"
          onClick={() => output && setOpen((v) => !v)}
          disabled={!output}
          title={t('meta.bashRun.hint')}
        >
          <span className="bash-run__prompt">!</span>
          <code className="bash-run__command">{item.meta?.label}</code>
          {output && <span className={`bash-run__chevron${open ? ' is-open' : ''}`}>▸</span>}
        </button>
        {open && output && <pre className="bash-run__output">{output}</pre>}
      </div>
    </article>
  )
}

/** Esc 중단 마커 — 사용자 액션이므로 우측 정렬의 얇은 상태 라인으로 표시 */
function InterruptLine({ item }: { item: UserItem }): ReactElement {
  const { t } = usePrefs()
  const label = item.meta?.label === 'tool-use' ? t('meta.interruptTool') : t('meta.interrupt')
  return (
    <div className="interrupt-line" role="status">
      <span className="interrupt-line__mark">⎋</span>
      <span>{label}</span>
    </div>
  )
}

/** 컨텍스트 요약으로 이어진 세션 경계 — 가로 구분선, 클릭하면 이월된 요약 전문 */
function CompactDivider({ item }: { item: UserItem }): ReactElement {
  const { t } = usePrefs()
  const [open, setOpen] = useState(false)
  const detail = item.meta?.detail ?? null
  return (
    <div className="compact-divider">
      <button
        className="compact-divider__row"
        onClick={() => detail && setOpen((v) => !v)}
        disabled={!detail}
        title={detail ? t('meta.compact.hint') : undefined}
      >
        <span className="compact-divider__line" />
        <span className="compact-divider__label">{t('meta.compact')}</span>
        <span className="compact-divider__line" />
      </button>
      {open && detail && <pre className="meta-line__detail compact-divider__detail">{detail}</pre>}
    </div>
  )
}

export function UserMessage({ item }: { item: UserItem }): ReactElement {
  const { t } = usePrefs()
  if (item.meta) {
    if (item.meta.kind === 'bashRun') return <BashRun item={item} />
    if (item.meta.kind === 'interrupt') return <InterruptLine item={item} />
    if (item.meta.kind === 'compact') return <CompactDivider item={item} />
    return <MetaLine item={item} />
  }
  const clock = formatClock(item.timestamp)
  return (
    <article className="user-message">
      {clock && <time className="item-clock">{clock}</time>}
      <div className="user-message__bubble">
        <pre className="user-message__text">{item.text}</pre>
        {item.images.length > 0 && (
          <div className="user-message__images">
            {item.images.map((image, index) => (
              <img
                key={index}
                src={`data:${image.mediaType};base64,${image.data}`}
                alt={t('image.attachment', { n: index + 1 })}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function ThinkingBlock({ text }: { text: string }): ReactElement {
  const { t, settings } = usePrefs()
  const [open, setOpen] = useState(settings.expandThinking)
  const preview = text.replace(/\s+/g, ' ').trim().slice(0, 90)
  return (
    <div className="thinking">
      <button className="thinking__row" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`thinking__chevron${open ? ' is-open' : ''}`}>▸</span>
        <span className="thinking__label">{t('thinking.label')}</span>
        {!open && <span className="thinking__preview">{preview}</span>}
      </button>
      {open && <div className="thinking__body">{text}</div>}
    </div>
  )
}

export function AssistantTurn({ item }: { item: AssistantItem }): ReactElement {
  const clock = formatClock(item.timestamp)
  return (
    <article className="assistant-turn">
      {clock && <time className="item-clock">{clock}</time>}
      {item.blocks.map((block, index) => {
        if (block.type === 'text') return <Markdown key={index} text={block.text} />
        if (block.type === 'thinking') return <ThinkingBlock key={index} text={block.text} />
        return <ToolCallCard key={block.id} call={block} />
      })}
    </article>
  )
}
