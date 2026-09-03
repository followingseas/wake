import { EventEmitter } from 'events'
import type { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadUpdate, initAutoUpdate } from './autoUpdate'

vi.mock('electron', () => ({ app: { isPackaged: true, getVersion: () => '0.9.0' } }))

vi.mock('electron-updater', async () => {
  const { EventEmitter } = await import('events')
  const fake = Object.assign(new EventEmitter(), {
    autoDownload: true, // 기본값 — initAutoUpdate 가 이걸 끄는지 본다
    autoInstallOnAppQuit: true,
    // 회귀 방지용 — 진행률이 이 값으로 되돌아가면 아래 버전 테스트가 깨진다
    currentVersion: { version: '0.9.0' },
    // 실제 downloadUpdate 는 Promise<string[]> 를 돌려주고 실패하면 거부한다
    downloadUpdate: vi.fn(() => Promise.resolve([])),
    quitAndInstall: vi.fn()
  })
  return { autoUpdater: fake }
})

/** initAutoUpdate 가 쓰는 만큼만 갖춘 창 대역 */
function fakeWindow(destroyed = false): { window: BrowserWindow; sent: unknown[] } {
  const sent: unknown[] = []
  const window = {
    isDestroyed: () => destroyed,
    webContents: {
      send: (channel: string, payload: unknown) => {
        if (channel === 'update:event') sent.push(payload)
      }
    }
  }
  return { window: window as unknown as BrowserWindow, sent }
}

const updater = autoUpdater as unknown as EventEmitter & {
  autoDownload: boolean
  downloadUpdate: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  updater.removeAllListeners()
  updater.autoDownload = true
  vi.clearAllMocks()
  updater.downloadUpdate.mockImplementation(() => Promise.resolve([]))
})

describe('initAutoUpdate', () => {
  it('새 버전을 찾으면 다운로드하지 않고 확인 이벤트를 보낸다', () => {
    const { window, sent } = fakeWindow()
    initAutoUpdate(window)

    updater.emit('update-available', { version: '0.9.1' })

    expect(sent).toEqual([{ type: 'available', version: '0.9.1' }])
    expect(updater.downloadUpdate).not.toHaveBeenCalled()
  })

  it('autoDownload 를 꺼서 라이브러리가 스스로 받지 않게 한다', () => {
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

  it('어느 버전을 받는지 모르면 진행률을 알리지 않는다', () => {
    const { window, sent } = fakeWindow()
    initAutoUpdate(window)

    updater.emit('download-progress', { percent: 30 })

    expect(sent).toEqual([])
  })

  it('다 받으면 설치 준비를 알린다', () => {
    const { window, sent } = fakeWindow()
    initAutoUpdate(window)

    updater.emit('update-downloaded', { version: '0.9.1' })

    expect(sent).toEqual([{ type: 'ready', version: '0.9.1' }])
  })

  it('오류를 렌더러까지 올린다', () => {
    const { window, sent } = fakeWindow()
    initAutoUpdate(window)

    // electron-updater 는 error 를 (에러, 스택) 두 인자로 발행한다
    updater.emit('error', new Error('ENOTFOUND'), 'stack')

    expect(sent).toEqual([{ type: 'error', message: 'ENOTFOUND' }])
  })

  it('창이 이미 닫혔으면 아무것도 보내지 않는다', () => {
    const { window, sent } = fakeWindow(true)
    initAutoUpdate(window)

    updater.emit('update-available', { version: '0.9.1' })

    expect(sent).toEqual([])
  })

  // autoUpdater 는 모듈 싱글턴이라, 창을 닫았다 다시 열면 리스너가 쌓이고 죽은 창의 클로저가 남는다
  it('창을 다시 열면 이전 창의 리스너를 남기지 않는다', () => {
    const first = fakeWindow()
    initAutoUpdate(first.window)
    const second = fakeWindow()
    initAutoUpdate(second.window)

    updater.emit('update-available', { version: '0.9.1' })

    expect(first.sent).toEqual([])
    expect(second.sent).toEqual([{ type: 'available', version: '0.9.1' }])
  })
})

describe('downloadUpdate', () => {
  it('라이브러리에 다운로드를 시작시킨다', async () => {
    await downloadUpdate()

    expect(updater.downloadUpdate).toHaveBeenCalledOnce()
  })

  it('실패해도 미처리 거부를 남기지 않는다', async () => {
    updater.downloadUpdate.mockImplementation(() => Promise.reject(new Error('ETIMEDOUT')))

    await expect(downloadUpdate()).resolves.toBeUndefined()
  })
})
