import { describe, expect, it } from 'vitest'
import { nextBanner, type UpdateBannerState } from './updateBanner'

const available: UpdateBannerState = { mode: 'available', version: '0.9.1' }
const downloading: UpdateBannerState = { mode: 'downloading', version: '0.9.1', percent: 42 }
const ready: UpdateBannerState = { mode: 'ready', version: '0.9.1' }

describe('nextBanner', () => {
  it('새 버전을 찾으면 승인을 기다리는 배너를 띄운다', () => {
    expect(nextBanner(null, { type: 'available', version: '0.9.1' })).toEqual(available)
  })

  it('받는 중에 실패하면 다시 누를 수 있게 승인 단계로 되돌린다', () => {
    expect(nextBanner(downloading, { type: 'error', message: 'ETIMEDOUT' })).toEqual(available)
  })

  it('설치를 기다리는 업데이트는 오류가 나도 지우지 않는다', () => {
    expect(nextBanner(ready, { type: 'error', message: 'ETIMEDOUT' })).toEqual(ready)
  })

  it('아직 승인하지 않은 배너는 오류가 나도 남겨 둔다', () => {
    expect(nextBanner(available, { type: 'error', message: 'ETIMEDOUT' })).toEqual(available)
  })

  it('배너가 없을 때의 오류는 조용히 넘어간다', () => {
    expect(nextBanner(null, { type: 'error', message: 'ENOTFOUND' })).toBeNull()
  })
})
