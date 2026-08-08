/**
 * 단축키는 metaKey와 ctrlKey를 함께 받으므로, 표기는 플랫폼에 맞춰 하나만 보여준다.
 * 둘 다 적으면(⌘/Ctrl+K) 좁은 칩 안에서 읽기 어렵다.
 */
const IS_MAC = navigator.userAgent.includes('Macintosh')

export function shortcut(key: string): string {
  return IS_MAC ? `⌘${key}` : `Ctrl+${key}`
}
