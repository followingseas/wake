import type { UserImage, UserMetaInfo } from '../../shared/types'
import type { JsonlEntry } from './jsonl'

interface ContentBlock {
  type?: string
  text?: string
  thinking?: string
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: unknown
  is_error?: boolean
  source?: { media_type?: string; data?: string }
}

export interface ParsedToolResult {
  toolUseId: string
  text: string
  isError: boolean
}

export interface ParsedUserContent {
  text: string
  images: UserImage[]
  toolResults: ParsedToolResult[]
}

export function getMessage(entry: JsonlEntry): Record<string, unknown> | null {
  const message = entry.message
  if (message && typeof message === 'object') return message as Record<string, unknown>
  return null
}

function blockContentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && (part as ContentBlock).type === 'text') {
          return (part as ContentBlock).text ?? ''
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

export function parseUserContent(entry: JsonlEntry): ParsedUserContent {
  const message = getMessage(entry)
  const content = message?.content
  const result: ParsedUserContent = { text: '', images: [], toolResults: [] }
  if (typeof content === 'string') {
    result.text = content
    return result
  }
  if (!Array.isArray(content)) return result

  const texts: string[] = []
  for (const raw of content) {
    if (typeof raw === 'string') {
      texts.push(raw)
      continue
    }
    const block = raw as ContentBlock
    if (block.type === 'text' && block.text) {
      texts.push(block.text)
    } else if (block.type === 'image' && block.source?.data) {
      result.images.push({
        mediaType: block.source.media_type ?? 'image/png',
        data: block.source.data
      })
    } else if (block.type === 'tool_result' && block.tool_use_id) {
      result.toolResults.push({
        toolUseId: block.tool_use_id,
        text: blockContentToText(block.content),
        isError: block.is_error === true
      })
    }
  }
  result.text = texts.join('\n')
  return result
}

const SYSTEM_REMINDER_RE = /<system-reminder>[\s\S]*?<\/system-reminder>/g
const CAVEAT_RE = /<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g

function extractTag(text: string, tag: string): string | null {
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match ? match[1].trim() : null
}

/**
 * 사용자 엔트리 텍스트를 화면용으로 정리한다.
 * 시스템 리마인더/커맨드 래퍼를 걷어내고, 시스템성 메시지면 meta 라벨을 붙인다.
 */
export function normalizeUserText(rawText: string): {
  text: string
  meta: UserMetaInfo | null
} {
  const stripped = rawText.replace(SYSTEM_REMINDER_RE, '').replace(CAVEAT_RE, '').trim()

  if (stripped.includes('<command-name>')) {
    const name = extractTag(stripped, 'command-name') ?? 'command'
    const args = extractTag(stripped, 'command-args')
    const stdout = extractTag(stripped, 'local-command-stdout')
    return {
      text: stdout ?? '',
      meta: { label: args ? `${name} ${args}` : name, detail: stdout }
    }
  }
  if (stripped.startsWith('<local-command-stdout>')) {
    const stdout = extractTag(stripped, 'local-command-stdout') ?? ''
    return { text: stdout, meta: { label: '커맨드 출력', detail: stdout } }
  }
  if (!stripped && rawText.trim()) {
    return { text: '', meta: { label: '시스템 컨텍스트', detail: rawText.trim() } }
  }
  return { text: stripped, meta: null }
}

/** 목록/제목에 쓸 수 있는 실제 사용자 발화인지 판별한다. */
export function isRealUserPrompt(entry: JsonlEntry): string | null {
  if (entry.type !== 'user' || entry.isSidechain === true) return null
  if (entry.isMeta === true) return null
  const { text, toolResults } = parseUserContent(entry)
  if (toolResults.length > 0) return null
  const { text: normalized, meta } = normalizeUserText(text)
  if (meta || !normalized) return null
  return normalized
}

export function summarize(text: string, maxLength: number): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= maxLength) return singleLine
  return `${singleLine.slice(0, maxLength)}…`
}
