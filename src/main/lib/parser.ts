import { basename } from 'path'
import type { AssistantBlock, Conversation, ConversationItem } from '../../shared/types'
import { forEachJsonlLine } from './jsonl'
import { getMessage, normalizeUserText, parseUserContent, summarize } from './entries'

interface RawContentBlock {
  type?: string
  text?: string
  thinking?: string
  id?: string
  name?: string
  input?: unknown
}

type ToolCallBlock = Extract<AssistantBlock, { type: 'toolCall' }>

export async function parseConversation(filePath: string): Promise<Conversation> {
  const items: ConversationItem[] = []
  const pendingToolCalls = new Map<string, ToolCallBlock>()
  let sidechainCount = 0
  let hiddenCount = 0
  let currentAssistant: Extract<ConversationItem, { kind: 'assistant' }> | null = null

  const flushAssistant = (): void => {
    currentAssistant = null
  }

  await forEachJsonlLine(filePath, (entry) => {
    if (entry.isSidechain === true) {
      if (entry.type === 'user' || entry.type === 'assistant') sidechainCount += 1
      return
    }

    if (entry.type === 'user') {
      const { text, images, toolResults } = parseUserContent(entry)

      for (const result of toolResults) {
        const call = pendingToolCalls.get(result.toolUseId)
        if (call) {
          call.result = result.text
          call.isError = result.isError
          pendingToolCalls.delete(result.toolUseId)
        }
      }
      // tool_result 전용 엔트리는 어시스턴트 턴 중간 단계이므로 별도 아이템으로 만들지 않는다
      if (toolResults.length > 0 && !text.trim() && images.length === 0) return

      // isMeta는 하네스가 주입한 user 롤 메시지(스킬 지침, 커맨드 캐비앳 등)를 표시한다
      if (entry.isMeta === true) {
        if (!text.trim()) {
          hiddenCount += 1
          return
        }
        flushAssistant()
        items.push({
          kind: 'user',
          uuid: typeof entry.uuid === 'string' ? entry.uuid : `user-${items.length}`,
          timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : null,
          text: '',
          images: [],
          meta: { kind: 'injected', label: summarize(text, 100), detail: text.trim() }
        })
        return
      }

      const { text: normalized, meta } = normalizeUserText(text)
      if (!normalized && !meta && images.length === 0) {
        hiddenCount += 1
        return
      }
      flushAssistant()
      items.push({
        kind: 'user',
        uuid: typeof entry.uuid === 'string' ? entry.uuid : `user-${items.length}`,
        timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : null,
        text: normalized,
        images,
        meta
      })
      return
    }

    if (entry.type === 'assistant') {
      const message = getMessage(entry)
      const content = message?.content
      if (!Array.isArray(content)) return

      const blocks: AssistantBlock[] = []
      for (const raw of content) {
        const block = raw as RawContentBlock
        if (block.type === 'text' && block.text?.trim()) {
          blocks.push({ type: 'text', text: block.text })
        } else if (block.type === 'thinking' && block.thinking?.trim()) {
          blocks.push({ type: 'thinking', text: block.thinking })
        } else if (block.type === 'tool_use' && block.id && block.name) {
          const call: ToolCallBlock = {
            type: 'toolCall',
            id: block.id,
            name: block.name,
            input: block.input ?? null,
            result: null,
            isError: false
          }
          pendingToolCalls.set(block.id, call)
          blocks.push(call)
        }
      }
      if (blocks.length === 0) return

      if (currentAssistant) {
        currentAssistant.blocks.push(...blocks)
      } else {
        currentAssistant = {
          kind: 'assistant',
          uuid: typeof entry.uuid === 'string' ? entry.uuid : `assistant-${items.length}`,
          timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : null,
          blocks
        }
        items.push(currentAssistant)
      }
      return
    }

    if (entry.type === 'attachment') hiddenCount += 1
  })

  return {
    sessionId: basename(filePath, '.jsonl'),
    items,
    sidechainCount,
    hiddenCount
  }
}
