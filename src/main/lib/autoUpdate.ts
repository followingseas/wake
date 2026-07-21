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

/** 서명된 패키지 앱에서만 동작한다. dev 모드는 legacy 확인(updater.ts)을 쓴다. */
export function isAutoUpdateSupported(): boolean {
  return app.isPackaged
}

export function initAutoUpdate(window: BrowserWindow): void {
  if (!isAutoUpdateSupported()) return

  const send = (event: UpdateEvent): void => {
    if (!window.isDestroyed()) window.webContents.send('update:event', event)
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('download-progress', (progress) => {
    const version = autoUpdater.currentVersion?.version ?? ''
    send({ type: 'downloading', version, percent: Math.round(progress.percent) })
  })
  autoUpdater.on('update-downloaded', (info) => {
    send({ type: 'ready', version: info.version })
  })
  autoUpdater.on('error', (error) => {
    // 오프라인 등은 조용히 넘어가되 렌더러가 상태를 정리할 수 있게 알린다
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
  } catch {
    return { currentVersion, latestVersion: null, hasUpdate: false, url: RELEASES_PAGE, auto: true }
  }
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
