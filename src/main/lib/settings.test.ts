import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSettings, saveSettings } from './settings'

// vi.mock 은 import 위로 끌어올려지므로 팩토리가 볼 값도 같이 끌어올려야 한다
const userData = vi.hoisted(() => ({ path: '' }))

vi.mock('electron', () => ({ app: { getPath: () => userData.path } }))

function writeRaw(raw: unknown): void {
  writeFileSync(join(userData.path, 'settings.json'), JSON.stringify(raw))
}

beforeEach(() => {
  userData.path = mkdtempSync(join(tmpdir(), 'wake-settings-'))
})

afterEach(() => {
  rmSync(userData.path, { recursive: true, force: true })
})

describe('sidebarSort 설정', () => {
  it('설정 파일이 없으면 최근 활동 순이다', () => {
    expect(loadSettings().sidebarSort).toBe('recent')
  })

  it('저장된 값을 읽는다', () => {
    writeRaw({ sidebarSort: 'name' })

    expect(loadSettings().sidebarSort).toBe('name')
  })

  it('모르는 값은 기본값으로 되돌린다', () => {
    writeRaw({ sidebarSort: 'size' })

    expect(loadSettings().sidebarSort).toBe('recent')
  })

  it('저장하면 다시 읽을 때 남아 있고 다른 설정은 건드리지 않는다', () => {
    writeRaw({ showAgentSessions: true })

    saveSettings({ sidebarSort: 'name' })

    expect(loadSettings()).toMatchObject({ sidebarSort: 'name', showAgentSessions: true })
  })
})
