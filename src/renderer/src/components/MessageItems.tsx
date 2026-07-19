import { useState, type ReactElement } from 'react'
import type { ConversationItem } from '../../../shared/types'
import { formatClock } from '../lib/format'
import { Markdown } from './Markdown'
import { ToolCallCard } from './ToolCallCard'

type UserItem = Extract<ConversationItem, { kind: 'user' }>
type AssistantItem = Extract<ConversationItem, { kind: 'assistant' }>

function MetaLine({ item }: { item: UserItem }): ReactElement {
  const [open, setOpen] = useState(false)
  const detail = item.meta?.detail ?? null
  return (
    <div className="meta-line">
      <button
        className="meta-line__row"
        onClick={() => detail && setOpen((v) => !v)}
        disabled={!detail}
      >
        <span className="meta-line__mark">·</span>
        <span className="meta-line__label">{item.meta?.label}</span>
      </button>
      {open && detail && <pre className="meta-line__detail">{detail}</pre>}
    </div>
  )
}

export function UserMessage({ item }: { item: UserItem }): ReactElement {
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
                alt={`첨부 이미지 ${index + 1}`}
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
  const [open, setOpen] = useState(false)
  const preview = text.replace(/\s+/g, ' ').trim().slice(0, 90)
  return (
    <div className="thinking">
      <button className="thinking__row" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`thinking__chevron${open ? ' is-open' : ''}`}>▸</span>
        <span className="thinking__label">사고 과정</span>
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
