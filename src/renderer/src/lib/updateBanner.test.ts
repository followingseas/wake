import { describe, expect, it } from 'vitest'
import { isDownloadFailure, nextBanner, type UpdateBannerState } from './updateBanner'

const available: UpdateBannerState = { mode: 'available', version: '0.9.1' }
const requested: UpdateBannerState = { mode: 'requested', version: '0.9.1' }
const downloading: UpdateBannerState = { mode: 'downloading', version: '0.9.1', percent: 42 }
const ready: UpdateBannerState = { mode: 'ready', version: '0.9.1' }
const link: UpdateBannerState = { mode: 'link', version: '0.9.1', url: 'https://example.test' }
const dismissed: UpdateBannerState = { mode: 'dismissed' }

describe('nextBanner', () => {
  it('새 버전을 찾으면 승인을 기다리는 배너를 띄운다', () => {
    expect(nextBanner(null, { type: 'available', version: '0.9.1' })).toEqual(available)
  })

  it('진행률이 오면 받는 중임을 알린다', () => {
    expect(nextBanner(available, { type: 'downloading', version: '0.9.1', percent: 42 })).toEqual(
      downloading
    )
  })

  it('다 받으면 설치를 기다리는 배너로 바꾼다', () => {
    expect(nextBanner(downloading, { type: 'ready', version: '0.9.1' })).toEqual(ready)
  })

  // 업데이트 확인은 설정 창을 열 때마다 돌고, electron-updater 는 그때마다 update-available 을
  // 다시 방출한다. 이미 진행한 상태가 승인 단계로 되돌아가면 사용자가 처음부터 다시 받게 된다
  it('받고 있는 버전을 다시 알려와도 진행률을 유지한다', () => {
    expect(nextBanner(downloading, { type: 'available', version: '0.9.1' })).toEqual(downloading)
  })

  it('설치를 기다리는 버전을 다시 알려와도 재시작 버튼을 유지한다', () => {
    expect(nextBanner(ready, { type: 'available', version: '0.9.1' })).toEqual(ready)
  })

  it('받던 것보다 더 새 버전이 나오면 다시 승인을 받는다', () => {
    expect(nextBanner(downloading, { type: 'available', version: '0.9.2' })).toEqual({
      mode: 'available',
      version: '0.9.2'
    })
  })

  it('승인했지만 아직 시작되기 전에 실패하면 다시 누를 수 있게 되돌린다', () => {
    expect(
      nextBanner({ mode: 'requested', version: '1.2.3' }, { type: 'error', message: 'x' })
    ).toEqual({ mode: 'available', version: '1.2.3' })
  })

  it('받는 중에 실패하면 다시 누를 수 있게 승인 단계로 되돌린다', () => {
    expect(
      nextBanner(
        { mode: 'downloading', version: '1.2.3', percent: 42 },
        { type: 'error', message: 'x' }
      )
    ).toEqual({ mode: 'available', version: '1.2.3' })
  })

  it('설치를 기다리는 업데이트는 오류가 나도 지우지 않는다', () => {
    expect(nextBanner(ready, { type: 'error', message: 'ETIMEDOUT' })).toEqual(ready)
  })

  it('아직 승인하지 않은 배너는 오류가 나도 남겨 둔다', () => {
    expect(nextBanner(available, { type: 'error', message: 'ETIMEDOUT' })).toEqual(available)
  })

  it('배너가 없을 때의 오류는 배너를 만들지 않는다', () => {
    expect(nextBanner(null, { type: 'error', message: 'ENOTFOUND' })).toBeNull()
  })

  // 닫기는 "이번 실행에서는 그만" 이라는 뜻이다. 진행률이 계속 오면 배너가 되살아난다
  it('사용자가 닫았으면 어떤 이벤트도 배너를 되살리지 않는다', () => {
    expect(nextBanner(dismissed, { type: 'available', version: '0.9.2' })).toEqual(dismissed)
    expect(nextBanner(dismissed, { type: 'downloading', version: '0.9.1', percent: 50 })).toEqual(
      dismissed
    )
    expect(nextBanner(dismissed, { type: 'ready', version: '0.9.1' })).toEqual(dismissed)
  })

  // legacy 링크 배너가 뜬 환경에는 이벤트 리스너 자체가 없다. 그래도 규약을 코드로 못박아 둔다
  it('링크 배너는 이벤트가 덮어쓰지 않는다', () => {
    expect(nextBanner(link, { type: 'available', version: '0.9.2' })).toEqual(link)
    expect(nextBanner(link, { type: 'error', message: 'x' })).toEqual(link)
  })
})

describe('isDownloadFailure', () => {
  it('승인한 다운로드가 승인 단계로 되돌아갔으면 실패다', () => {
    expect(isDownloadFailure(requested, available)).toBe(true)
    expect(isDownloadFailure(downloading, available)).toBe(true)
  })

  it('아직 누르지 않은 배너가 그대로인 것은 실패가 아니다', () => {
    expect(isDownloadFailure(available, available)).toBe(false)
  })

  // 받던 중에 더 새 버전이 나오면 승인 배너로 바뀐다 — 실패가 아니라 갈아타기다
  it('더 새 버전으로 갈아타는 것은 실패가 아니다', () => {
    expect(isDownloadFailure(downloading, { mode: 'available', version: '0.9.2' })).toBe(false)
  })

  it('정상 진행은 실패가 아니다', () => {
    expect(isDownloadFailure(requested, downloading)).toBe(false)
    expect(isDownloadFailure(downloading, ready)).toBe(false)
  })
})
