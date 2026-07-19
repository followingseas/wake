import { app } from 'electron'
import type { UpdateInfo } from '../../shared/types'

// TODO: 2026-07-19 서명·공증 도입 후 electron-updater 기반 자동 업데이트로 전환
const LATEST_RELEASE_API = 'https://api.github.com/repos/jeongph/wake/releases/latest'
const RELEASES_PAGE = 'https://github.com/jeongph/wake/releases/latest'

function parseVersion(version: string): number[] {
  return version
    .replace(/^v/, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0)
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

let cached: UpdateInfo | null = null

export async function checkForUpdate(): Promise<UpdateInfo> {
  if (cached) return cached

  const currentVersion = process.env.CHV_FAKE_VERSION ?? app.getVersion()
  const noUpdate: UpdateInfo = {
    currentVersion,
    latestVersion: null,
    hasUpdate: false,
    url: RELEASES_PAGE
  }

  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'wake-app' },
      signal: AbortSignal.timeout(5000)
    })
    if (!response.ok) return noUpdate
    const release = (await response.json()) as { tag_name?: string; html_url?: string }
    if (typeof release.tag_name !== 'string') return noUpdate

    const latestVersion = release.tag_name.replace(/^v/, '')
    cached = {
      currentVersion,
      latestVersion,
      hasUpdate: isNewer(latestVersion, currentVersion),
      url: release.html_url ?? RELEASES_PAGE
    }
    return cached
  } catch {
    // 오프라인이거나 API 제한에 걸리면 조용히 넘어간다 (다음 실행 때 재시도)
    return noUpdate
  }
}
