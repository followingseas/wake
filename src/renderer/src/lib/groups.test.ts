import { describe, expect, it } from 'vitest'
import type { ProjectInfo, RepoInfo } from '../../../shared/types'
import { buildGroups } from './groups'

// repo 를 직접 주면 realPath 와 무관하게 그 값을 쓴다. 기본은 realPath 를 루트로 하는 저장소 루트다
function project(partial: Partial<ProjectInfo> & { id: string }): ProjectInfo {
  const realPath = partial.realPath === undefined ? `/repo/${partial.id}` : partial.realPath
  return {
    dirName: partial.id,
    dirPath: `/projects/${partial.id}`,
    realPath,
    name: partial.id,
    sessionCount: 0,
    userSessionCount: 0,
    lastActiveAt: 1,
    repo: { rootPath: realPath, sub: null },
    ...partial
  }
}

function worktree(rootPath: string | null, name: string, rootDirName = 'root'): RepoInfo {
  return { rootPath, rootDirName, sub: { kind: 'worktree', name } }
}

function ids(projects: ProjectInfo[]): string[] {
  return projects.map((p) => p.id)
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

  it('루트 그룹은 저장소 경로를 키와 이름으로 쓴다', () => {
    const groups = buildGroups(
      [
        project({
          id: '-x-root',
          realPath: '/x/root',
          name: 'root',
          sessionCount: 1,
          userSessionCount: 1
        })
      ],
      false
    )

    expect(groups[0].id).toBe('repo:/x/root')
    expect(groups[0].name).toBe('root')
    expect(groups[0].rootPath).toBe('/x/root')
    expect(ids(groups[0].roots)).toEqual(['-x-root'])
  })

  it('같은 저장소를 가리키는 루트 프로젝트는 한 그룹으로 합쳐 최근 순으로 둔다', () => {
    const groups = buildGroups(
      [
        project({
          id: 'a',
          realPath: '/x/root',
          sessionCount: 2,
          userSessionCount: 2,
          lastActiveAt: 5
        }),
        project({
          id: 'b',
          realPath: '/x/root',
          sessionCount: 3,
          userSessionCount: 3,
          lastActiveAt: 9
        })
      ],
      false
    )

    expect(groups).toHaveLength(1)
    expect(ids(groups[0].roots)).toEqual(['b', 'a'])
    expect(groups[0].totalSessions).toBe(5)
    expect(groups[0].lastActiveAt).toBe(9)
  })

  it('워크트리는 rootPath 로 루트 그룹에 붙는다', () => {
    const groups = buildGroups(
      [
        project({ id: 'root', realPath: '/repo/root', sessionCount: 1, userSessionCount: 1 }),
        project({
          id: 'wt',
          sessionCount: 4,
          userSessionCount: 3,
          repo: worktree('/repo/root', 'feature')
        })
      ],
      false
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].subs).toHaveLength(1)
    expect(groups[0].subs[0]).toMatchObject({
      id: 'repo:/repo/root|worktree:feature',
      kind: 'worktree',
      name: 'feature',
      totalSessions: 3
    })
    expect(ids(groups[0].subs[0].projects)).toEqual(['wt'])
    expect(groups[0].totalSessions).toBe(4)
  })

  it('워크트리가 루트보다 먼저 와도 같은 그룹에 붙는다', () => {
    const groups = buildGroups(
      [
        project({
          id: 'wt',
          sessionCount: 1,
          userSessionCount: 1,
          repo: worktree('/repo/root', 'feature')
        }),
        project({ id: 'root', realPath: '/repo/root', sessionCount: 1, userSessionCount: 1 })
      ],
      false
    )

    expect(groups).toHaveLength(1)
    expect(ids(groups[0].roots)).toEqual(['root'])
    expect(groups[0].subs).toHaveLength(1)
  })

  it('하위 폴더도 같은 방식으로 루트 그룹에 붙는다', () => {
    const groups = buildGroups(
      [
        project({ id: 'root', realPath: '/repo/root', sessionCount: 1, userSessionCount: 1 }),
        project({
          id: 'docs',
          sessionCount: 1,
          userSessionCount: 1,
          repo: { rootPath: '/repo/root', rootDirName: null, sub: { kind: 'subdir', name: 'docs' } }
        })
      ],
      false
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].subs[0]).toMatchObject({ kind: 'subdir', name: 'docs' })
  })

  it('같은 자리를 가리키는 하위 프로젝트는 한 항목으로 합친다', () => {
    const groups = buildGroups(
      [
        project({ id: 'root', realPath: '/repo/root', sessionCount: 1, userSessionCount: 1 }),
        project({
          id: 'x',
          sessionCount: 1,
          userSessionCount: 1,
          lastActiveAt: 2,
          repo: worktree('/repo/root', 'feature')
        }),
        project({
          id: 'y',
          sessionCount: 2,
          userSessionCount: 2,
          lastActiveAt: 7,
          repo: worktree('/repo/root', 'feature')
        })
      ],
      false
    )

    expect(groups[0].subs).toHaveLength(1)
    expect(ids(groups[0].subs[0].projects)).toEqual(['y', 'x'])
    expect(groups[0].subs[0].totalSessions).toBe(3)
    expect(groups[0].subs[0].lastActiveAt).toBe(7)
  })

  it('루트가 비어도 워크트리에 표시할 세션이 있으면 그룹은 남는다', () => {
    const groups = buildGroups(
      [
        project({ id: 'root', realPath: '/repo/root', sessionCount: 1, userSessionCount: 0 }),
        project({
          id: 'wt',
          sessionCount: 4,
          userSessionCount: 3,
          repo: worktree('/repo/root', 'feature')
        })
      ],
      false
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].totalSessions).toBe(3)
    expect(groups[0].subs).toHaveLength(1)
  })

  it('표시할 세션이 없는 워크트리는 그룹에서 빠진다', () => {
    const groups = buildGroups(
      [
        project({ id: 'root', realPath: '/repo/root', sessionCount: 2, userSessionCount: 2 }),
        project({
          id: 'wt',
          sessionCount: 4,
          userSessionCount: 0,
          repo: worktree('/repo/root', 'bot')
        })
      ],
      false
    )

    expect(groups[0].subs).toHaveLength(0)
    expect(groups[0].totalSessions).toBe(2)
  })

  it('숨겨진 루트의 활동 시각은 그룹 정렬에 끼지 않는다', () => {
    // 최근 활동이 전부 자동 세션인 프로젝트가 보여줄 것도 없이 맨 위로 올라오면 안 된다
    const groups = buildGroups(
      [
        project({ id: 'other', sessionCount: 1, userSessionCount: 1, lastActiveAt: 100 }),
        project({
          id: 'root',
          realPath: '/repo/root',
          sessionCount: 3,
          userSessionCount: 0,
          lastActiveAt: 999
        }),
        project({
          id: 'wt',
          sessionCount: 1,
          userSessionCount: 1,
          lastActiveAt: 5,
          repo: worktree('/repo/root', 'a')
        })
      ],
      false
    )

    expect(groups.map((g) => g.id)).toEqual(['repo:/repo/other', 'repo:/repo/root'])
    expect(groups[1].lastActiveAt).toBe(5)
  })

  it('루트 프로젝트가 없으면 저장소 경로만으로 합성 그룹을 만든다', () => {
    const groups = buildGroups(
      [
        project({
          id: 'wt1',
          sessionCount: 1,
          userSessionCount: 1,
          repo: worktree('/x/tool', 'a')
        }),
        project({ id: 'wt2', sessionCount: 1, userSessionCount: 1, repo: worktree('/x/tool', 'b') })
      ],
      false
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe('synthetic:/x/tool')
    expect(groups[0].name).toBe('tool')
    expect(groups[0].rootPath).toBe('/x/tool')
    expect(groups[0].roots).toHaveLength(0)
    expect(groups[0].subs.map((s) => s.name)).toEqual(['a', 'b'])
  })

  it('rootPath 를 모르는 워크트리는 rootDirName 으로 루트를 찾는다', () => {
    const groups = buildGroups(
      [
        project({ id: '-x-root', realPath: '/x/root', sessionCount: 1, userSessionCount: 1 }),
        project({
          id: '-x-root--claude-worktrees-a',
          realPath: null,
          sessionCount: 1,
          userSessionCount: 1,
          repo: worktree(null, 'a', '-x-root')
        })
      ],
      false
    )

    expect(groups).toHaveLength(1)
    expect(ids(groups[0].subs[0].projects)).toEqual(['-x-root--claude-worktrees-a'])
  })

  it('rootPath 가 어떤 루트와도 맞지 않으면 rootDirName 으로 루트를 찾는다', () => {
    const groups = buildGroups(
      [
        project({ id: '-x-root', realPath: '/x/root', sessionCount: 1, userSessionCount: 1 }),
        project({
          id: 'wt',
          sessionCount: 1,
          userSessionCount: 1,
          repo: worktree('/x/stale', 'a', '-x-root')
        })
      ],
      false
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe('repo:/x/root')
    expect(groups[0].subs).toHaveLength(1)
  })

  it('rootPath 도 루트도 없는 워크트리는 rootDirName 으로 합성 그룹을 만들고 이름은 하이픈 마지막 조각으로 추정한다', () => {
    const groups = buildGroups(
      [
        project({
          id: '-x-my-tool--claude-worktrees-a',
          realPath: null,
          sessionCount: 1,
          userSessionCount: 1,
          repo: worktree(null, 'a', '-x-my-tool')
        })
      ],
      false
    )

    expect(groups[0].id).toBe('synthetic:-x-my-tool')
    expect(groups[0].name).toBe('tool')
    expect(groups[0].rootPath).toBeNull()
  })

  it('경로를 모르는 독립 프로젝트는 자기 id 를 그룹 키로 쓴다', () => {
    const groups = buildGroups(
      [
        project({
          id: '-x-alone',
          realPath: null,
          sessionCount: 1,
          userSessionCount: 1,
          repo: { rootPath: null, sub: null }
        })
      ],
      false
    )

    expect(groups[0].id).toBe('-x-alone')
    expect(groups[0].rootPath).toBeNull()
  })

  it('그룹과 하위 항목은 최근 활동 순으로 정렬한다', () => {
    const groups = buildGroups(
      [
        project({ id: 'old', sessionCount: 1, userSessionCount: 1, lastActiveAt: 1 }),
        project({
          id: 'root',
          realPath: '/repo/root',
          sessionCount: 1,
          userSessionCount: 1,
          lastActiveAt: 2
        }),
        project({
          id: 'wt-a',
          sessionCount: 1,
          userSessionCount: 1,
          lastActiveAt: 3,
          repo: worktree('/repo/root', 'a')
        }),
        project({
          id: 'wt-b',
          sessionCount: 1,
          userSessionCount: 1,
          lastActiveAt: 7,
          repo: worktree('/repo/root', 'b')
        })
      ],
      false
    )

    expect(groups.map((g) => g.id)).toEqual(['repo:/repo/root', 'repo:/repo/old'])
    expect(groups[0].subs.map((s) => s.name)).toEqual(['b', 'a'])
    expect(groups[0].lastActiveAt).toBe(7)
  })
})
