import { describe, expect, it } from 'vitest'
import type { ProjectInfo } from '../../../shared/types'
import { buildGroups } from './groups'

function project(partial: Partial<ProjectInfo> & { id: string }): ProjectInfo {
  return {
    dirName: partial.id,
    dirPath: `/projects/${partial.id}`,
    realPath: `/repo/${partial.id}`,
    name: partial.id,
    sessionCount: 0,
    userSessionCount: 0,
    lastActiveAt: 1,
    worktree: null,
    ...partial
  }
}

describe('buildGroups', () => {
  it('토글이 꺼져 있으면 userSessionCount 로 센다', () => {
    const groups = buildGroups([project({ id: 'a', sessionCount: 5, userSessionCount: 2 })], false)

    expect(groups).toHaveLength(1)
    expect(groups[0].totalSessions).toBe(2)
  })

  it('토글이 켜져 있으면 sessionCount 로 센다', () => {
    const groups = buildGroups([project({ id: 'a', sessionCount: 5, userSessionCount: 2 })], true)

    expect(groups[0].totalSessions).toBe(5)
  })

  it('표시할 세션이 없는 프로젝트는 그룹에서 빠진다', () => {
    const groups = buildGroups([project({ id: 'a', sessionCount: 3, userSessionCount: 0 })], false)

    expect(groups).toHaveLength(0)
  })

  it('루트가 비어도 워크트리에 표시할 세션이 있으면 그룹은 남는다', () => {
    const groups = buildGroups(
      [
        project({ id: 'root', realPath: '/repo/root', sessionCount: 1, userSessionCount: 0 }),
        project({
          id: 'wt',
          sessionCount: 4,
          userSessionCount: 3,
          worktree: { rootPath: '/repo/root', rootDirName: 'root', name: 'feature' }
        })
      ],
      false
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].totalSessions).toBe(3)
    expect(groups[0].worktrees).toHaveLength(1)
  })

  it('표시할 세션이 없는 워크트리는 그룹에서 빠진다', () => {
    const groups = buildGroups(
      [
        project({ id: 'root', realPath: '/repo/root', sessionCount: 2, userSessionCount: 2 }),
        project({
          id: 'wt',
          sessionCount: 4,
          userSessionCount: 0,
          worktree: { rootPath: '/repo/root', rootDirName: 'root', name: 'bot' }
        })
      ],
      false
    )

    expect(groups[0].worktrees).toHaveLength(0)
    expect(groups[0].totalSessions).toBe(2)
  })
})
