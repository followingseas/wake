import { BrowserWindow, Menu, type MenuItemConstructorOptions, type WebContents } from 'electron'

/** checked 를 주면 라디오 항목이 된다 — 여러 값 중 지금 값을 표시할 때 쓴다 */
export type ChoiceItem<T extends string> =
  { value: T; label: string; checked?: boolean } | { type: 'separator' }

/** 네이티브 팝업 메뉴를 띄우고 고른 항목의 값을, 그냥 닫히면 null 을 돌려준다 */
export function popupChoice<T extends string>(
  sender: WebContents,
  items: ChoiceItem<T>[]
): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false
    const done = (value: T | null): void => {
      if (!settled) {
        settled = true
        resolve(value)
      }
    }
    const template = items.map((item): MenuItemConstructorOptions => {
      if ('type' in item) return { type: 'separator' }
      const base = { label: item.label, click: () => done(item.value) }
      return item.checked === undefined ? base : { ...base, type: 'radio', checked: item.checked }
    })
    const window = BrowserWindow.fromWebContents(sender) ?? undefined
    // 닫힘 콜백이 클릭 핸들러보다 먼저 올 수 있어 한 틱 늦춰 null 처리한다
    Menu.buildFromTemplate(template).popup({
      window,
      callback: () => setTimeout(() => done(null), 100)
    })
  })
}
