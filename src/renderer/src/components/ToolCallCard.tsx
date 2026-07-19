import { useState, type ReactElement } from 'react'
import type { AssistantBlock } from '../../../shared/types'

type ToolCall = Extract<AssistantBlock, { type: 'toolCall' }>

function firstString(input: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = input[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  for (const value of Object.values(input)) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function summarizeInput(name: string, input: unknown): string {
  if (!input || typeof input !== 'object') return ''
  const record = input as Record<string, unknown>
  switch (name) {
    case 'Bash':
      return firstString(record, ['command']) ?? ''
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'NotebookEdit':
      return firstString(record, ['file_path']) ?? ''
    case 'Glob':
    case 'Grep':
      return firstString(record, ['pattern']) ?? ''
    case 'Task':
    case 'Agent':
      return firstString(record, ['description', 'prompt']) ?? ''
    case 'WebFetch':
      return firstString(record, ['url']) ?? ''
    case 'WebSearch':
      return firstString(record, ['query']) ?? ''
    case 'Skill':
      return firstString(record, ['skill']) ?? ''
    case 'TodoWrite':
      return '할 일 목록 갱신'
    default:
      return firstString(record, ['description', 'query', 'path']) ?? ''
  }
}

function formatInput(input: unknown): string {
  if (input == null) return ''
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

const RESULT_PREVIEW_LIMIT = 20_000

export function ToolCallCard({ call }: { call: ToolCall }): ReactElement {
  const [open, setOpen] = useState(false)
  const summary = summarizeInput(call.name, call.input)
  const result = call.result ?? ''
  const truncated = result.length > RESULT_PREVIEW_LIMIT

  return (
    <div className={`tool-card${call.isError ? ' tool-card--error' : ''}`}>
      <button className="tool-card__row" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`tool-card__chevron${open ? ' is-open' : ''}`}>▸</span>
        <span className="tool-card__name">{call.name}</span>
        {summary && <span className="tool-card__summary">{summary}</span>}
        {call.isError && <span className="tool-card__badge">오류</span>}
      </button>
      {open && (
        <div className="tool-card__detail">
          {call.input != null && (
            <section>
              <h5>입력</h5>
              <pre className="tool-card__pre">{formatInput(call.input)}</pre>
            </section>
          )}
          <section>
            <h5>결과</h5>
            {result ? (
              <pre className="tool-card__pre">
                {truncated ? `${result.slice(0, RESULT_PREVIEW_LIMIT)}\n… (이하 생략)` : result}
              </pre>
            ) : (
              <p className="tool-card__empty">기록된 결과가 없습니다.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
