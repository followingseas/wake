import type { SearchHit, SearchSnippet } from '../../shared/types'
import type { SearchMessage } from './searchExtract'

/** 스니펫에서 매칭 앞뒤로 남길 문자 수 */
const CONTEXT_BEFORE = 50
const CONTEXT_AFTER = 110

export interface IndexedMessage extends SearchMessage {
  /** text의 소문자 사본 — 검색마다 코퍼스 전체를 다시 변환하지 않으려고 적재 시 한 번 만든다 */
  lower: string
}

export interface SearchDocument {
  sessionId: string
  projectId: string
  filePath: string
  title: string
  updatedAt: number
  fileSize: number
  messages: IndexedMessage[]
}

export function indexMessages(messages: SearchMessage[]): IndexedMessage[] {
  return messages.map((message) => ({ ...message, lower: message.text.toLowerCase() }))
}

/** 여러 줄을 한 줄로 눌러 스니펫 한 행에 담기게 한다 */
function flatten(text: string): string {
  return text.replace(/\s+/g, ' ')
}

export function buildSnippet(
  message: SearchMessage,
  matchIndex: number,
  matchLength: number
): SearchSnippet {
  const start = Math.max(0, matchIndex - CONTEXT_BEFORE)
  const end = Math.min(message.text.length, matchIndex + matchLength + CONTEXT_AFTER)
  const head = start > 0 ? '…' : ''
  const tail = end < message.text.length ? '…' : ''
  return {
    ref: message.ref,
    role: message.role,
    before: head + flatten(message.text.slice(start, matchIndex)),
    match: flatten(message.text.slice(matchIndex, matchIndex + matchLength)),
    after: flatten(message.text.slice(matchIndex + matchLength, end)) + tail
  }
}

/**
 * 문서 하나에서 질의를 모두 찾는다. 매칭이 없으면 null.
 * lowered는 이미 소문자로 만들어 넘겨야 한다.
 *
 * 소문자 변환은 사실상 모든 문자에서 길이를 보존하므로, lower에서 얻은 인덱스를 원문
 * 슬라이스에 그대로 쓴다.
 */
export function matchDocument(
  document: SearchDocument,
  lowered: string,
  maxSnippets: number
): SearchHit | null {
  // 빈 질의는 indexOf가 매번 0을 돌려줘 무한 루프가 된다
  if (!lowered) return null

  let matchCount = 0
  const snippets: SearchSnippet[] = []
  for (const message of document.messages) {
    let from = 0
    for (;;) {
      const index = message.lower.indexOf(lowered, from)
      if (index === -1) break
      matchCount += 1
      if (snippets.length < maxSnippets) {
        snippets.push(buildSnippet(message, index, lowered.length))
      }
      from = index + lowered.length
    }
  }
  if (matchCount === 0) return null
  return {
    sessionId: document.sessionId,
    projectId: document.projectId,
    filePath: document.filePath,
    title: document.title,
    updatedAt: document.updatedAt,
    matchCount,
    snippets
  }
}
