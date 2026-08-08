import type { ProjectInfo } from '../../../shared/types'

export interface ProjectGroup {
  root: ProjectInfo
  synthetic: boolean
  worktrees: ProjectInfo[]
  totalSessions: number
  lastActiveAt: number
}

// 합성 루트(id가 이 접두사로 시작)는 실제 프로젝트 디렉토리가 없어 세션 로딩을 하지 않는다
export const SYNTHETIC_PREFIX = 'synthetic:'

export function buildGroups(projects: ProjectInfo[], showAgentSessions: boolean): ProjectGroup[] {
  // 표시할 세션 수는 토글에 따라 달라진다. 카운트 배지와 "빈 그룹 숨김" 판정이 같은 값을 써야
  // 숫자와 실제 목록이 어긋나지 않는다.
  const visibleCount = (project: ProjectInfo): number =>
    showAgentSessions ? project.sessionCount : project.userSessionCount

  const groups = new Map<string, ProjectGroup>()
  const byRealPath = new Map<string, ProjectInfo>()
  const byDirName = new Map<string, ProjectInfo>()

  for (const project of projects) {
    if (project.worktree) continue
    if (project.realPath) byRealPath.set(project.realPath, project)
    byDirName.set(project.dirName, project)
    groups.set(project.id, {
      root: project,
      synthetic: false,
      worktrees: [],
      totalSessions: visibleCount(project),
      lastActiveAt: project.lastActiveAt
    })
  }

  for (const project of projects) {
    const wt = project.worktree
    if (!wt) continue
    if (visibleCount(project) === 0) continue
    const root =
      (wt.rootPath ? byRealPath.get(wt.rootPath) : undefined) ??
      (wt.rootDirName ? byDirName.get(wt.rootDirName) : undefined)
    let group = root ? groups.get(root.id) : undefined
    if (!group) {
      const key = SYNTHETIC_PREFIX + (wt.rootPath ?? wt.rootDirName)
      group = groups.get(key)
      if (!group) {
        const name = wt.rootPath
          ? (wt.rootPath.split('/').pop() ?? wt.rootPath)
          : (wt.rootDirName.split('-').filter(Boolean).pop() ?? wt.rootDirName)
        group = {
          root: {
            id: key,
            dirName: wt.rootDirName,
            dirPath: '',
            realPath: wt.rootPath,
            name,
            sessionCount: 0,
            userSessionCount: 0,
            lastActiveAt: 0,
            worktree: null
          },
          synthetic: true,
          worktrees: [],
          totalSessions: 0,
          lastActiveAt: 0
        }
        groups.set(key, group)
      }
    }
    group.worktrees.push(project)
    group.totalSessions += visibleCount(project)
    group.lastActiveAt = Math.max(group.lastActiveAt, project.lastActiveAt)
  }

  // 보여줄 세션이 하나도 없는 그룹은 내보내지 않는다. 상태에서 지우지 않고 여기서 거르므로
  // 토글을 다시 켜면 그대로 돌아온다.
  const list = [...groups.values()].filter((group) => group.totalSessions > 0)
  for (const group of list) group.worktrees.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
  return list.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
}
