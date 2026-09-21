import type { MenuItemConstructorOptions, WebContents } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { popupChoice } from './choiceMenu'

// vi.mock 은 import 위로 끌어올려지므로 팩토리가 볼 값도 같이 끌어올려야 한다
const shown = vi.hoisted(() => ({
  template: [] as MenuItemConstructorOptions[],
  close: (): void => {}
}))

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => {
      shown.template = template
      return {
        popup: (options: { callback: () => void }) => {
          shown.close = options.callback
        }
      }
    }
  },
  BrowserWindow: { fromWebContents: () => null }
}))

const sender = {} as WebContents

function click(label: string): void {
  const item = shown.template.find((candidate) => candidate.label === label)
  if (!item?.click) throw new Error(`메뉴에 없는 항목: ${label}`)
  ;(item.click as () => void)()
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
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

    shown.close()
    await vi.runAllTimersAsync()

    await expect(choice).resolves.toBeNull()
  })

  it('닫힘 콜백이 클릭보다 먼저 와도 고른 값을 돌려준다', async () => {
    const choice = popupChoice(sender, [{ value: 'reveal', label: 'Reveal' }])

    shown.close()
    click('Reveal')
    await vi.runAllTimersAsync()

    await expect(choice).resolves.toBe('reveal')
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

  it('checked 가 없는 항목은 보통 항목이고 구분선은 그대로 넘긴다', () => {
    void popupChoice(sender, [
      { value: 'reveal', label: 'Reveal' },
      { type: 'separator' },
      { value: 'delete', label: 'Delete' }
    ])

    expect(shown.template.map((item) => item.type)).toEqual([undefined, 'separator', undefined])
  })
})
