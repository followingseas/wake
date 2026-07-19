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
    meta?.label ??
    (meta?.kind === 'output' ? t('meta.output') : meta?.kind === 'context' ? t('meta.context') : '')
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

export function UserMessage({ item }: { item: UserItem }): ReactElement {
  const { t } = usePrefs()
  if (item.meta) return <MetaLine item={item} />
  const clock = formatClock(item.timestamp)
  return (
    <article className="user-message">
      <div className="user-message__gutter" aria-hidden="true">
        ❯
      </div>
      <div className="user-message__body">
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
      {clock && <time className="item-clock">{clock}</time>}
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
