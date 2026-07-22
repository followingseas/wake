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

export function buildGroups(projects: ProjectInfo[]): ProjectGroup[] {
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
      totalSessions: project.sessionCount,
      lastActiveAt: project.lastActiveAt
    })
  }

  for (const project of projects) {
    const wt = project.worktree
    if (!wt) continue
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
    group.totalSessions += project.sessionCount
    group.lastActiveAt = Math.max(group.lastActiveAt, project.lastActiveAt)
  }

  const list = [...groups.values()]
  for (const group of list) group.worktrees.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
  return list.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
}
