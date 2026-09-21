/**
 * 사이드바 그룹과 그 하위 항목의 정렬 기준. 세션 목록은 기준과 무관하게 늘 최근 순이다.
 * 타입을 이 목록에서 뽑으므로, 기준을 늘릴 때 허용 목록을 따로 맞출 일이 없다.
 */
export const SIDEBAR_SORTS = ['recent', 'name'] as const

export type SidebarSort = (typeof SIDEBAR_SORTS)[number]
