import { describe, expect, it } from 'vitest'
import type { Conversation, ConversationItem } from '../../shared/types'
import { extractSearchMessages } from './searchExtract'

function conversation(items: ConversationItem[]): Conversation {
  return { sessionId: 'session-1', items, sidechainCount: 0, hiddenCount: 0 }
}

describe('extractSearchMessages', () => {
  it('사용자 발화와 어시스턴트 텍스트를 uuid와 함께 뽑는다', () => {
    const result = extractSearchMessages(
      conversation([
        {
          kind: 'user',
          uuid: 'u1',
          timestamp: null,
          text: '검색 기능 만들자',
          images: [],
          meta: null
        },
        {
          kind: 'assistant',
          uuid: 'a1',
          timestamp: null,
          blocks: [{ type: 'text', text: '인덱스를 먼저 만들죠' }]
        }
      ])
    )
    expect(result).toEqual([
      { ref: 'u1', role: 'user', text: '검색 기능 만들자' },
      { ref: 'a1', role: 'assistant', text: '인덱스를 먼저 만들죠' }
    ])
  })

  it('meta가 붙은 사용자 아이템은 발화가 아니므로 제외한다', () => {
    const result = extractSearchMessages(
      conversation([
        {
          kind: 'user',
          uuid: 'u1',
          timestamp: null,
          text: '',
          images: [],
          meta: { kind: 'command', label: 'model', detail: '출력' }
        }
      ])
    )
    expect(result).toEqual([])
  })

  it('사고 과정과 도구 호출은 제외하고 텍스트 블록만 이어 붙인다', () => {
    const result = extractSearchMessages(
      conversation([
        {
          kind: 'assistant',
          uuid: 'a1',
          timestamp: null,
          blocks: [
            { type: 'thinking', text: '내부 독백' },
            { type: 'text', text: '첫 문단' },
            {
              type: 'toolCall',
              id: 't1',
              name: 'Read',
              input: null,
              result: '파일 내용',
              isError: false
            },
            { type: 'text', text: '둘째 문단' }
          ]
        }
      ])
    )
    expect(result).toEqual([{ ref: 'a1', role: 'assistant', text: '첫 문단\n둘째 문단' }])
  })

  it('공백뿐인 아이템은 버린다', () => {
    const result = extractSearchMessages(
      conversation([
        { kind: 'user', uuid: 'u1', timestamp: null, text: '   \n ', images: [], meta: null },
        { kind: 'assistant', uuid: 'a1', timestamp: null, blocks: [] }
      ])
    )
    expect(result).toEqual([])
  })
})
