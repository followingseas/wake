import type { Conversation } from '../../shared/types'

export interface SearchMessage {
  /** 매칭된 ConversationItem의 uuid — 검색 결과에서 이 아이템으로 이동하는 데 쓴다 */
  ref: string
  role: 'user' | 'assistant'
  text: string
}

/**
 * 대화에서 검색 대상 텍스트만 뽑는다.
 *
 * 도구 호출·결과는 원본 JSONL의 99%를 차지해 결과를 덮어버리고, 사고 과정은 모델 내부
 * 독백이라 뺀다. meta가 붙은 사용자 아이템(커맨드 출력·주입 컨텍스트·셸 실행 등)도
 * 사용자가 한 말이 아니므로 제외한다.
 *
 * JSONL을 직접 읽지 않고 파서 출력에서 뽑는 이유: 연속 assistant 엔트리를 파서가 한
 * 아이템으로 병합하므로, 엔트리 uuid를 그대로 쓰면 화면에 없는 아이템을 가리키게 된다.
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
