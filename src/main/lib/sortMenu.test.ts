import { describe, expect, it } from 'vitest'
import { sortMenuItems } from './sortMenu'

describe('sortMenuItems', () => {
  it('기준마다 받은 라벨로 항목을 만들고 지금 기준에만 체크한다', () => {
    expect(sortMenuItems({ recent: '최근 활동순', name: '이름순' }, 'name')).toEqual([
      { value: 'recent', label: '최근 활동순', checked: false },
      { value: 'name', label: '이름순', checked: true }
    ])
  })

  it('라벨이 오지 않으면 기본 라벨로 채운다', () => {
    const items = sortMenuItems(undefined, 'recent')

    expect(items.map((item) => item.label)).toEqual(['Recent activity', 'Name'])
  })

  it('라벨이 문자열이 아니면 문자열로 바꾼다', () => {
    const items = sortMenuItems({ recent: 1, name: null }, 'recent')

    expect(items.map((item) => item.label)).toEqual(['1', 'Name'])
  })

  it('모르는 기준이 오면 어디에도 체크하지 않는다', () => {
    const items = sortMenuItems({ recent: 'Recent', name: 'Name' }, 'size')

    expect(items.map((item) => item.checked)).toEqual([false, false])
  })
})
