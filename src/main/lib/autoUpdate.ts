import { app, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateEvent, UpdateInfo } from '../../shared/types'

const RELEASES_PAGE = 'https://github.com/followingseas/wake/releases/latest'

function parseVersion(version: string): number[] {
  return version
    .replace(/^v/, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0)
}

export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

/** app.isPackaged 만 본다 — 서명이 없으면 설치 단계에서 error 이벤트로 드러난다. dev 는 legacy 확인(updater.ts) */
export function isAutoUpdateSupported(): boolean {
  return app.isPackaged
}

export function initAutoUpdate(window: BrowserWindow): void {
  if (!isAutoUpdateSupported()) return

  const send = (event: UpdateEvent): void => {
    if (!window.isDestroyed()) window.webContents.send('update:event', event)
  }

  // autoUpdater 는 모듈 싱글턴이다. 창을 다시 열 때 리스너가 쌓이고 죽은 창의 클로저가 남는다
  autoUpdater.removeAllListeners()

  // 다운로드는 사용자가 배너에서 승인해야 시작한다 (downloadUpdate)
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  // autoUpdater.currentVersion 은 설치된 버전이라 진행률에 쓸 수 없다. 받고 있는 버전을 기억해 둔다
  let pendingVersion: string | null = null
  autoUpdater.on('update-available', (info) => {
    pendingVersion = info.version
    send({ type: 'available', version: info.version })
  })
  autoUpdater.on('download-progress', (progress) => {
    // 어느 버전을 받는지 모르면 "새 버전 v 다운로드 중" 같은 빈 안내가 된다. 차라리 침묵한다
    if (pendingVersion === null) return
    send({ type: 'downloading', version: pendingVersion, percent: Math.round(progress.percent) })
  })
  autoUpdater.on('update-downloaded', (info) => {
    send({ type: 'ready', version: info.version })
  })
  autoUpdater.on('error', (error) => {
    // 오류는 막지 않고 그대로 올린다. 사용자에게 보일지와 배너를 어떻게 되돌릴지는 렌더러가 정한다
    send({ type: 'error', message: error.message })
  })
}

export async function checkViaAutoUpdater(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion()
  try {
    const result = await autoUpdater.checkForUpdates()
    const latestVersion = result?.updateInfo.version ?? null
    return {
      currentVersion,
      latestVersion,
      hasUpdate: latestVersion !== null && isNewer(latestVersion, currentVersion),
      url: RELEASES_PAGE,
      auto: true
    }
  } catch (error) {
    // 확인 실패와 "최신입니다"가 구분되지 않는다. 최소한 흔적은 남긴다
    console.error('[update] 업데이트 확인 실패', error)
    return { currentVersion, latestVersion: null, hasUpdate: false, url: RELEASES_PAGE, auto: true }
  }
}

/**
 * 사용자가 배너에서 승인했을 때만 호출한다. update-available 이 뜬 뒤라야 하고, 그 전이면
 * electron-updater 가 거부한다. 실패는 'error' 이벤트로 렌더러에 전달된다
 */
export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    // 취소는 'error' 이벤트를 내지 않는다. 삼키면 배너가 승인 상태에 갇히므로 렌더러까지 올린다
    console.error('[update] 다운로드 실패', error)
    throw error
  }
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
