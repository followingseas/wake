import { describe, expect, it } from 'vitest'
import { originFromEntrypoint } from './sessionOrigin'

describe('originFromEntrypoint', () => {
  it('sdk- 로 시작하는 entrypoint는 자동 세션으로 본다', () => {
    expect(originFromEntrypoint('sdk-cli')).toBe('agent')
    expect(originFromEntrypoint('sdk-py')).toBe('agent')
  })

  it('cli 는 사람이 연 세션으로 본다', () => {
    expect(originFromEntrypoint('cli')).toBe('user')
  })

  it('entrypoint 가 없는 구버전 세션은 사람이 연 세션으로 본다', () => {
    expect(originFromEntrypoint(null)).toBe('user')
    expect(originFromEntrypoint(undefined)).toBe('user')
  })

  it('sdk 가 접두가 아니면 자동 세션이 아니다', () => {
    expect(originFromEntrypoint('my-sdk-runner')).toBe('user')
  })
})
