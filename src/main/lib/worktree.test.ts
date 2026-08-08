import { describe, expect, it } from 'vitest'
import { detectWorktree } from './worktree'

describe('detectWorktree', () => {
  it('.claude 워크트리는 이름 한 단계를 그대로 쓴다', () => {
    expect(
      detectWorktree(
        '-Users-me-Dev-wake--claude-worktrees-mossy-flask',
        '/Users/me/Dev/wake/.claude/worktrees/mossy-flask'
      )
    ).toEqual({
      rootPath: '/Users/me/Dev/wake',
      rootDirName: '-Users-me-Dev-wake',
      name: 'mossy-flask'
    })
  })

  it('.orca 워크트리는 부모 repo명 세그먼트를 벗겨낸다', () => {
    expect(
      detectWorktree(
        '-Users-me-Dev-wake--orca-worktrees-wake-sargassum',
        '/Users/me/Dev/wake/.orca/worktrees/wake/sargassum'
      )
    ).toEqual({
      rootPath: '/Users/me/Dev/wake',
      rootDirName: '-Users-me-Dev-wake',
      name: 'sargassum'
    })
  })

  it('하이픈이 든 repo명도 경로에서는 정확히 갈린다', () => {
    const found = detectWorktree(
      '-Users-me-repos-fond-monorepo--orca-worktrees-fond-monorepo-kingfish',
      '/Users/me/repos/fond-monorepo/.orca/worktrees/fond-monorepo/kingfish'
    )
    expect(found?.name).toBe('kingfish')
    expect(found?.rootPath).toBe('/Users/me/repos/fond-monorepo')
  })

  it('중간 세그먼트가 부모 repo명과 다르면 벗기지 않는다', () => {
    const found = detectWorktree(
      '-Users-me-Dev-wake--orca-worktrees-other-thing',
      '/Users/me/Dev/wake/.orca/worktrees/other/thing'
    )
    expect(found?.name).toBe('other/thing')
  })

  it('처음 보는 도구의 worktrees 도 감지한다', () => {
    const found = detectWorktree(
      '-Users-me-Dev-wake--newtool-worktrees-branch-a',
      '/Users/me/Dev/wake/.newtool/worktrees/branch-a'
    )
    expect(found?.name).toBe('branch-a')
    expect(found?.rootPath).toBe('/Users/me/Dev/wake')
  })

  it('realPath 가 없으면 디렉터리명으로 폴백한다', () => {
    expect(detectWorktree('-Users-me-Dev-wake--claude-worktrees-mossy-flask', null)).toEqual({
      rootPath: null,
      rootDirName: '-Users-me-Dev-wake',
      name: 'mossy-flask'
    })
  })

  it('폴백에서는 repo명을 추측해 벗기지 않는다', () => {
    // 하이픈 인코딩이라 경계를 알 수 없다. 잘못 벗기면 이름이 깨진다.
    expect(detectWorktree('-Users-me-Dev-wake--orca-worktrees-wake-sargassum', null)?.name).toBe(
      'wake-sargassum'
    )
  })

  it('워크트리가 아니면 null 을 준다', () => {
    expect(detectWorktree('-Users-me-Dev-wake', '/Users/me/Dev/wake')).toBeNull()
  })

  it('worktrees 가 점 디렉터리 밑이 아니면 워크트리가 아니다', () => {
    expect(
      detectWorktree('-Users-me-Dev-wake-worktrees-a', '/Users/me/Dev/wake/worktrees/a')
    ).toBeNull()
  })
})
