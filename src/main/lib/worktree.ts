import { basename } from 'path'
import type { WorktreeInfo } from '../../shared/types'

// 도구가 만든 워크트리는 <repo>/.<도구>/worktrees/… 아래에 놓인다.
// .claude 는 이름 한 단계(<이름>), .orca 는 repo명을 한 번 더 낀 두 단계(<repo명>/<이름>)를 쓴다.
// 도구명을 하드코딩하지 않고 패턴으로 잡아 새 도구도 그대로 지원한다.
const PATH_MARKER = /\/\.[^/]+\/worktrees\//
// 프로젝트 디렉터리명은 경로의 '/'와 '.'을 '-'로 바꾼 것이라 '/.orca/worktrees/'가
// '--orca-worktrees-'로 나타난다.
const DIR_MARKER = /--[^-]+-worktrees-/

/**
 * 워크트리 세션인지 판별하고 부모 repo를 찾는다.
 *
 * realPath(cwd)가 있으면 경로를 그대로 가르므로 하이픈이 든 repo명도 정확하다.
 * 없을 때만 디렉터리명으로 폴백하는데, 그쪽은 '/'와 '-'가 뭉개져 있어 repo명 경계를
 * 알 수 없다. 그래서 폴백에서는 추측해서 벗기지 않고 마커 뒤 전체를 이름으로 쓴다.
 */
export function detectWorktree(dirName: string, realPath: string | null): WorktreeInfo | null {
  let rootPath: string | null = null
  let name: string | null = null

  if (realPath) {
    const match = PATH_MARKER.exec(realPath)
    if (match) {
      rootPath = realPath.slice(0, match.index)
      const segments = realPath
        .slice(match.index + match[0].length)
        .split('/')
        .filter(Boolean)
      // 첫 세그먼트가 부모 repo명이면 중복이라 벗긴다 (.orca 형태)
      if (segments.length > 1 && segments[0] === basename(rootPath)) segments.shift()
      name = segments.join('/') || null
    }
  }

  const dirMatch = DIR_MARKER.exec(dirName)
  const rootDirName = dirMatch ? dirName.slice(0, dirMatch.index) : ''
  if (name === null && dirMatch) {
    name = dirName.slice(dirMatch.index + dirMatch[0].length) || null
  }

  if (name === null) return null
  return { rootPath, rootDirName, name }
}
