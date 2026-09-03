import { EventEmitter } from 'events'
import type { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initAutoUpdate } from './autoUpdate'

vi.mock('electron', () => ({ app: { isPackaged: true, getVersion: () => '0.9.0' } }))

vi.mock('electron-updater', async () => {
  const { EventEmitter } = await import('events')
  const fake = Object.assign(new EventEmitter(), {
    // electron-updater 의 기본값 — 프로덕션 코드가 이걸 바꾸는지 보려고 그대로 둔다
    autoDownload: true,
    autoInstallOnAppQuit: false,
    currentVersion: { version: '0.9.0' },
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn()
  })
  return { autoUpdater: fake }
})

/** initAutoUpdate 가 쓰는 만큼만 갖춘 창 대역 */
function fakeWindow(): { window: BrowserWindow; sent: unknown[] } {
  const sent: unknown[] = []
  const window = {
    isDestroyed: () => false,
    webContents: {
      send: (channel: string, payload: unknown) => {
        if (channel === 'update:event') sent.push(payload)
      }
    }
  }
  return { window: window as unknown as BrowserWindow, sent }
}

const updater = autoUpdater as unknown as EventEmitter & { autoDownload: boolean }

beforeEach(() => {
  updater.removeAllListeners()
  updater.autoDownload = true
})

describe('initAutoUpdate', () => {
  it('새 버전을 찾으면 다운로드하지 않고 확인 이벤트를 보낸다', () => {
    const { window, sent } = fakeWindow()
    initAutoUpdate(window)

    updater.emit('update-available', { version: '0.9.1' })

    expect(sent).toEqual([{ type: 'available', version: '0.9.1' }])
  })

  it('확인 단계에서 다운로드를 자동으로 시작하지 않는다', () => {
    initAutoUpdate(fakeWindow().window)

    expect(updater.autoDownload).toBe(false)
  })

  it('진행률은 설치된 버전이 아니라 받고 있는 버전을 알린다', () => {
    const { window, sent } = fakeWindow()
    initAutoUpdate(window)

    updater.emit('update-available', { version: '0.9.1' })
    updater.emit('download-progress', { percent: 41.6 })

    expect(sent.at(-1)).toEqual({ type: 'downloading', version: '0.9.1', percent: 42 })
  })
})
