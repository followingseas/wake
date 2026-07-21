import { app } from 'electron'
import type { UpdateInfo } from '../../shared/types'
import { isNewer } from './autoUpdate'

// dev 모드 등 electron-updater를 못 쓰는 환경의 legacy 확인 경로 (다운로드 링크 안내만)
const LATEST_RELEASE_API = 'https://api.github.com/repos/followingseas/wake/releases/latest'
const RELEASES_PAGE = 'https://github.com/followingseas/wake/releases/latest'

let cached: UpdateInfo | null = null

export async function checkForUpdate(force = false): Promise<UpdateInfo> {
  if (cached && !force) return cached

  const currentVersion = process.env.CHV_FAKE_VERSION ?? app.getVersion()
  const noUpdate: UpdateInfo = {
    currentVersion,
    latestVersion: null,
    hasUpdate: false,
    url: RELEASES_PAGE,
    auto: false
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
      url: release.html_url ?? RELEASES_PAGE,
      auto: false
    }
    return cached
  } catch {
    // 오프라인이거나 API 제한에 걸리면 조용히 넘어간다 (다음 실행 때 재시도)
    return noUpdate
  }
}
