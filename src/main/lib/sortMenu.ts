import { SIDEBAR_SORTS, type SidebarSort } from '../../shared/sidebarSort'

// 렌더러가 라벨을 보내지 않았을 때 쓴다. 기준을 늘리면 여기서 컴파일 에러가 난다
const FALLBACK_LABELS: Record<SidebarSort, string> = {
  recent: 'Recent activity',
  name: 'Name'
}

interface SortMenuItem {
  value: SidebarSort
  label: string
  checked: boolean
}

/** 정렬 메뉴 항목. 인자는 렌더러가 보낸 값이라 모양을 믿지 않는다 */
export function sortMenuItems(labels: unknown, current: unknown): SortMenuItem[] {
  const given = (labels ?? {}) as Partial<Record<SidebarSort, unknown>>
  return SIDEBAR_SORTS.map((value) => ({
    value,
    label: String(given[value] ?? FALLBACK_LABELS[value]),
    checked: value === current
  }))
}
