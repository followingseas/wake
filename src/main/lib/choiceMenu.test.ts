import type { BrowserWindow, MenuItemConstructorOptions, PopupOptions, WebContents } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { popupChoice } from './choiceMenu'

const sender = {} as WebContents
const senderWindow = {} as BrowserWindow

// vi.mock 은 import 위로 끌어올려지므로 팩토리가 볼 값도 같이 끌어올려야 한다
const shown = vi.hoisted(() => ({
  template: [] as MenuItemConstructorOptions[],
  options: {} as PopupOptions,
  windows: new Map<unknown, unknown>()
}))

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => {
      shown.template = template
      return {
        popup: (options: PopupOptions) => {
          shown.options = options
        }
      }
    }
  },
  BrowserWindow: { fromWebContents: (contents: unknown) => shown.windows.get(contents) ?? null }
}))

function click(label: string): void {
  const item = shown.template.find((candidate) => candidate.label === label)
  if (!item?.click) throw new Error(`메뉴에 없는 항목: ${label}`)
  ;(item.click as () => void)()
}

function close(): void {
  if (!shown.options.callback) throw new Error('팝업이 뜨지 않았다')
  shown.options.callback()
}

beforeEach(() => {
  vi.useFakeTimers()
  // 앞 테스트가 띄운 메뉴를 상대로 조용히 통과하지 않게 비운다
  shown.template = []
  shown.options = {}
  shown.windows = new Map([[sender, senderWindow]])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('popupChoice', () => {
  it('고른 항목의 값을 돌려준다', async () => {
    const choice = popupChoice(sender, [
      { value: 'reveal', label: 'Reveal' },
      { value: 'delete', label: 'Delete' }
    ])

    click('Delete')

    await expect(choice).resolves.toBe('delete')
  })

  it('고르지 않고 닫으면 null 을 돌려준다', async () => {
    const choice = popupChoice(sender, [{ value: 'reveal', label: 'Reveal' }])

    close()
    await vi.runAllTimersAsync()

    await expect(choice).resolves.toBeNull()
  })

  it('닫힘 콜백이 클릭보다 먼저 와도 고른 값을 돌려준다', async () => {
    const choice = popupChoice(sender, [{ value: 'reveal', label: 'Reveal' }])

    close()
    click('Reveal')
    await vi.runAllTimersAsync()

    await expect(choice).resolves.toBe('reveal')
  })

  it('닫힘 처리가 끝난 뒤 도착한 선택은 버리고 기록을 남긴다', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const choice = popupChoice(sender, [{ value: 'reveal', label: 'Reveal' }])

    close()
    await vi.runAllTimersAsync()
    click('Reveal')

    await expect(choice).resolves.toBeNull()
    expect(logged).toHaveBeenCalledTimes(1)
    expect(logged.mock.calls[0]).toContain('reveal')
  })

  it('checked 를 준 항목은 라디오로 만들고 그 값대로 체크한다', () => {
    void popupChoice(sender, [
      { value: 'recent', label: 'Recent', checked: true },
      { value: 'name', label: 'Name', checked: false }
    ])

    expect(shown.template).toMatchObject([
      { label: 'Recent', type: 'radio', checked: true },
      { label: 'Name', type: 'radio', checked: false }
    ])
  })

  it('checked 가 없는 항목은 라디오가 아니고 구분선은 제자리에 둔다', () => {
    void popupChoice(sender, [
      { value: 'reveal', label: 'Reveal' },
      { type: 'separator' },
      { value: 'delete', label: 'Delete' }
    ])

    expect(shown.template.map((item) => item.type === 'separator')).toEqual([false, true, false])
    expect(shown.template.map((item) => item.type === 'radio')).toEqual([false, false, false])
  })

  it('sender 가 속한 창을 팝업 대상으로 넘긴다', () => {
    void popupChoice(sender, [{ value: 'reveal', label: 'Reveal' }])

    expect(shown.options.window).toBe(senderWindow)
  })

  it('자리를 주면 정수로 맞춰 그 좌표에 띄운다', () => {
    void popupChoice(sender, [{ value: 'reveal', label: 'Reveal' }], { x: 260.5, y: 79.25 })

    expect(shown.options).toMatchObject({ x: 261, y: 79 })
  })

  it('자리를 주지 않으면 좌표 없이 띄워 커서 위치에 뜨게 둔다', () => {
    void popupChoice(sender, [{ value: 'reveal', label: 'Reveal' }])

    expect(shown.options).not.toHaveProperty('x')
    expect(shown.options).not.toHaveProperty('y')
  })

  it('자리가 숫자가 아니면 좌표 없이 띄운다', () => {
    void popupChoice(sender, [{ value: 'reveal', label: 'Reveal' }], {
      x: Number.NaN,
      y: 'bottom' as unknown as number
    })

    expect(shown.options).not.toHaveProperty('x')
    expect(shown.options).not.toHaveProperty('y')
  })
})
