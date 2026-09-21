import { BrowserWindow, Menu, type MenuItemConstructorOptions, type WebContents } from 'electron'
import type { MenuAnchor } from '../../shared/types'

/** checked 를 주면 라디오 항목이 된다 — 여러 값 중 지금 값을 표시할 때 쓴다 */
export type ChoiceItem<T extends string> =
  { value: T; label: string; checked?: boolean } | { type: 'separator' }

/**
 * 네이티브 팝업 메뉴를 띄우고 고른 항목의 값을, 그냥 닫히면 null 을 돌려준다.
 * at 을 주지 않으면 커서 위치에 뜬다. 우클릭 메뉴는 그게 맞지만, 키보드로도 누를 수 있는
 * 버튼에서 열 때는 커서가 엉뚱한 데 있을 수 있으니 버튼 자리를 넘긴다.
 */
export function popupChoice<T extends string>(
  sender: WebContents,
  items: ChoiceItem<T>[],
  at?: MenuAnchor
): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false
    const done = (value: T | null): void => {
      if (settled) {
        // 닫힘 처리가 먼저 끝나 버린 선택이다. 흔적이 없으면 "눌렀는데 안 먹는다"를 추적할 길이 없다
        if (value !== null) console.error('[menu] 닫힘 처리 뒤에 도착한 선택을 버렸다', value)
        return
      }
      settled = true
      resolve(value)
    }
    const template = items.map((item): MenuItemConstructorOptions => {
      if ('type' in item) return { type: 'separator' }
      const base = { label: item.label, click: () => done(item.value) }
      return item.checked === undefined ? base : { ...base, type: 'radio', checked: item.checked }
    })
    const window = BrowserWindow.fromWebContents(sender) ?? undefined
    // 좌표는 렌더러가 보낸 값이다. 숫자가 아니면 버리고 커서 위치에 띄운다
    const anchored = Number.isFinite(at?.x) && Number.isFinite(at?.y)
    // 닫힘 콜백이 클릭 핸들러보다 먼저 올 수 있어 한 틱 늦춰 null 처리한다
    Menu.buildFromTemplate(template).popup({
      window,
      ...(at && anchored && { x: Math.round(at.x), y: Math.round(at.y) }),
      callback: () => setTimeout(() => done(null), 100)
    })
  })
}
