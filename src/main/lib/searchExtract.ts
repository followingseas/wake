import type { Conversation } from '../../shared/types'

/** 이 모양 그대로 검색 인덱스에 저장된다 — 필드가 바뀌면 INDEX_VERSION을 올릴 것 */
export interface SearchMessage {
  /** 매칭된 ConversationItem의 uuid — 검색 결과에서 이 아이템으로 이동하는 데 쓴다 */
  ref: string
  role: 'user' | 'assistant'
  text: string
}

/**
 * 대화에서 검색 대상 텍스트만 뽑는다.
 *
 * 도구 호출·결과는 사용자가 기억하는 문장이 아니면서 분량으로 결과를 압도하고, 사고
 * 과정은 모델 내부 독백이라 뺀다. meta가 붙은 사용자 아이템 중 본문이 실려 오는 건
 * 커맨드 출력뿐이고 그것도 사용자 발화가 아니다. 다만 이 규칙 때문에 bashRun의 명령어와
 * compact의 이월 요약은 화면에 보이면서 검색에는 잡히지 않는다.
 *
 * ref는 반드시 파서 출력의 uuid여야 한다. 파서가 연속 assistant 엔트리를 한 아이템으로
 * 병합하므로, JSONL을 직접 읽어 엔트리 uuid를 쓰면 화면에 없는 아이템을 가리킨다.
 */
export function extractSearchMessages(conversation: Conversation): SearchMessage[] {
  const messages: SearchMessage[] = []
  for (const item of conversation.items) {
    if (item.kind === 'user') {
      if (item.meta !== null) continue
      const text = item.text.trim()
      if (text) messages.push({ ref: item.uuid, role: 'user', text })
      continue
    }
    const texts: string[] = []
    for (const block of item.blocks) {
      if (block.type === 'text') texts.push(block.text)
    }
    const text = texts.join('\n').trim()
    if (text) messages.push({ ref: item.uuid, role: 'assistant', text })
  }
  return messages
}
