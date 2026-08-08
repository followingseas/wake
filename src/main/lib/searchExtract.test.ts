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

  it('meta가 붙은 사용자 아이템은 본문이 남아 있어도 제외한다', () => {
    // meta 아이템에도 text는 실린다(슬래시 커맨드 원문·주입 컨텍스트 등). 그래서 빈
    // text로 검사하면 meta 분기를 text 공백 검사로 바꿔치기해도 테스트가 통과한다 —
    // 걸러지는 기준이 meta라는 것을 확인하려면 본문이 있는 meta 아이템이 필요하다.
    const result = extractSearchMessages(
      conversation([
        {
          kind: 'user',
          uuid: 'u1',
          timestamp: null,
          text: '/model 을 opus 로 바꿔줘',
          images: [],
          meta: { kind: 'command', label: 'model', detail: '출력' }
        },
        {
          kind: 'user',
          uuid: 'u2',
          timestamp: null,
          text: '이건 진짜 발화',
          images: [],
          meta: null
        }
      ])
    )
    expect(result).toEqual([{ ref: 'u2', role: 'user', text: '이건 진짜 발화' }])
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

  it('텍스트 블록이 있어도 내용이 공백뿐이면 어시스턴트 아이템을 버린다', () => {
    // blocks가 비어 있는 경우와 다른 분기다 — texts는 채워지고 join 뒤 trim에서 비게
    // 된다. 이 아이템이 통과하면 검색 결과에 빈 스니펫 행이 생긴다.
    const result = extractSearchMessages(
      conversation([
        {
          kind: 'assistant',
          uuid: 'a1',
          timestamp: null,
          blocks: [
            { type: 'thinking', text: '내부 독백' },
            { type: 'text', text: '  \n ' }
          ]
        }
      ])
    )
    expect(result).toEqual([])
  })

  it('일부 텍스트 블록만 공백이면 나머지 블록은 살린다', () => {
    // 공백 블록 하나 때문에 아이템 전체를 버리거나, 블록별 trim으로 "정리"하면서
    // 뒤 문단을 잃어버리는 회귀를 잡는다.
    const result = extractSearchMessages(
      conversation([
        {
          kind: 'assistant',
          uuid: 'a1',
          timestamp: null,
          blocks: [
            { type: 'text', text: '첫 문단' },
            { type: 'text', text: '   ' },
            { type: 'text', text: '둘째 문단' }
          ]
        }
      ])
    )
    expect(result).toHaveLength(1)
    expect(result[0].text).toContain('첫 문단')
    expect(result[0].text).toContain('둘째 문단')
  })
})
