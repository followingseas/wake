import { describe, expect, it } from 'vitest'
import type { SearchMessage } from './searchExtract'
import { indexMessages, matchDocument, type SearchDocument } from './searchMatch'

function document(messages: SearchMessage[]): SearchDocument {
  return {
    sessionId: 'session-1',
    projectId: 'project-1',
    filePath: '/tmp/session-1.jsonl',
    title: '세션 제목',
    updatedAt: 1_700_000_000_000,
    fileSize: 1024,
    messages: indexMessages(messages)
  }
}

describe('matchDocument', () => {
  it('매칭이 없으면 null을 돌려준다', () => {
    const result = matchDocument(document([{ ref: 'u1', role: 'user', text: '고래' }]), '상어', 5)
    expect(result).toBeNull()
  })

  it('빈 질의는 매칭으로 치지 않는다', () => {
    const result = matchDocument(document([{ ref: 'u1', role: 'user', text: '고래' }]), '', 5)
    expect(result).toBeNull()
  })

  it('대소문자를 무시하고 찾으며 원문 대소문자로 스니펫을 만든다', () => {
    const result = matchDocument(
      document([{ ref: 'u1', role: 'user', text: 'SearchIndex 를 만들자' }]),
      'searchindex',
      5
    )
    expect(result?.matchCount).toBe(1)
    expect(result?.snippets[0].match).toBe('SearchIndex')
  })

  it('한 문서 안의 모든 매칭을 센다', () => {
    const result = matchDocument(
      document([
        { ref: 'u1', role: 'user', text: '검색 검색' },
        { ref: 'a1', role: 'assistant', text: '검색이요' }
      ]),
      '검색',
      5
    )
    expect(result?.matchCount).toBe(3)
  })

  it('스니펫 수는 상한을 넘지 않지만 matchCount는 전체를 센다', () => {
    const result = matchDocument(
      document([{ ref: 'u1', role: 'user', text: '가 가 가 가 가' }]),
      '가',
      2
    )
    expect(result?.matchCount).toBe(5)
    expect(result?.snippets).toHaveLength(2)
  })

  it('긴 텍스트는 앞뒤를 잘라 말줄임표를 붙이고 개행을 눌러 준다', () => {
    const long = `${'앞'.repeat(200)}\n표적\n${'뒤'.repeat(200)}`
    const result = matchDocument(document([{ ref: 'u1', role: 'user', text: long }]), '표적', 5)
    const snippet = result?.snippets[0]
    expect(snippet?.before.startsWith('…')).toBe(true)
    expect(snippet?.after.endsWith('…')).toBe(true)
    expect(snippet?.before).not.toContain('\n')
    expect(snippet?.after).not.toContain('\n')
    expect(snippet?.match).toBe('표적')
  })

  it('짧은 텍스트에는 말줄임표를 붙이지 않는다', () => {
    const result = matchDocument(document([{ ref: 'u1', role: 'user', text: '표적' }]), '표적', 5)
    expect(result?.snippets[0]).toEqual({
      ref: 'u1',
      role: 'user',
      before: '',
      match: '표적',
      after: ''
    })
  })

  it('세션 식별 정보를 그대로 옮긴다', () => {
    const result = matchDocument(document([{ ref: 'u1', role: 'user', text: '표적' }]), '표적', 5)
    expect(result).toMatchObject({
      sessionId: 'session-1',
      projectId: 'project-1',
      filePath: '/tmp/session-1.jsonl',
      title: '세션 제목',
      updatedAt: 1_700_000_000_000
    })
  })
})
