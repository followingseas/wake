import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listProjects, listSessions } from './scanner'

let root: string

function project(name: string): string {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  return dir
}

/** 실제 대화 한 턴짜리 세션 파일을 만든다. entrypoint 가 null 이면 필드를 생략한다. */
function writeSession(dir: string, id: string, entrypoint: string | null): void {
  const lines = [
    {
      type: 'user',
      ...(entrypoint === null ? {} : { entrypoint }),
      cwd: '/repo',
      timestamp: '2026-08-08T00:00:00.000Z',
      message: { role: 'user', content: '안녕' }
    },
    {
      type: 'assistant',
      timestamp: '2026-08-08T00:00:01.000Z',
      message: { id: `msg-${id}`, role: 'assistant', content: [{ type: 'text', text: '네' }] }
    }
  ]
  writeFileSync(join(dir, `${id}.jsonl`), lines.map((line) => JSON.stringify(line)).join('\n'))
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'wake-scanner-'))
  process.env.CHV_DATA_DIR = root
})

afterEach(() => {
  delete process.env.CHV_DATA_DIR
  rmSync(root, { recursive: true, force: true })
})

describe('listSessions', () => {
  it('entrypoint 로 세션의 origin 을 채운다', async () => {
    const dir = project('repo')
    writeSession(dir, 'aaa', 'cli')
    writeSession(dir, 'bbb', 'sdk-py')
    writeSession(dir, 'ccc', null)

    const sessions = await listSessions('repo')
    const origins = Object.fromEntries(sessions.map((s) => [s.id, s.origin]))

    expect(origins).toEqual({ aaa: 'user', bbb: 'agent', ccc: 'user' })
  })

  it('처음 만난 entrypoint 를 쓰고 뒤에 다른 값이 와도 바뀌지 않는다', async () => {
    const dir = project('repo')
    writeFileSync(
      join(dir, 'mixed.jsonl'),
      [
        {
          type: 'user',
          entrypoint: 'sdk-py',
          timestamp: '2026-08-08T00:00:00.000Z',
          message: { role: 'user', content: '안녕' }
        },
        {
          type: 'assistant',
          entrypoint: 'cli',
          timestamp: '2026-08-08T00:00:01.000Z',
          message: { id: 'msg-1', role: 'assistant', content: [{ type: 'text', text: '네' }] }
        }
      ]
        .map((line) => JSON.stringify(line))
        .join('\n')
    )

    const [session] = await listSessions('repo')

    expect(session.origin).toBe('agent')
  })
})

describe('listProjects', () => {
  it('userSessionCount 는 자동 세션을 빼고 센다', async () => {
    const dir = project('repo')
    writeSession(dir, 'aaa', 'cli')
    writeSession(dir, 'bbb', 'sdk-py')
    writeSession(dir, 'ccc', 'sdk-cli')

    const [found] = await listProjects()

    expect(found.sessionCount).toBe(3)
    expect(found.userSessionCount).toBe(1)
  })

  it('자동 세션만 있는 프로젝트는 userSessionCount 가 0 이다', async () => {
    const dir = project('bot-only')
    writeSession(dir, 'aaa', 'sdk-cli')

    const [found] = await listProjects()

    expect(found.sessionCount).toBe(1)
    expect(found.userSessionCount).toBe(0)
  })
})

/** 임의의 엔트리 목록을 세션 파일로 쓴다. 대화 한 턴은 뒤에 붙여 실제 세션으로 잡히게 한다 */
function writeEntries(dir: string, id: string, entries: Record<string, unknown>[]): void {
  const lines = [
    ...entries,
    {
      type: 'assistant',
      timestamp: '2026-08-08T00:00:01.000Z',
      message: { id: `msg-${id}`, role: 'assistant', content: [{ type: 'text', text: '네' }] }
    }
  ]
  writeFileSync(join(dir, `${id}.jsonl`), lines.map((line) => JSON.stringify(line)).join('\n'))
}

describe('listProjects realPath', () => {
  const prompt = { role: 'user', content: '안녕' }
  // Claude Code 가 cwd 로 프로젝트 디렉터리명을 만드는 규칙. 임시 폴더 안의 경로를 써야
  // 저장소 판정이 개발 머신의 실제 파일시스템에 좌우되지 않는다
  const dirNameOf = (cwd: string): string => cwd.replace(/[^A-Za-z0-9]/g, '-')

  it('디렉터리명과 맞아떨어지는 cwd 를 첫 cwd 보다 우선한다', async () => {
    const cwd = join(root, 'main')
    const dir = project(dirNameOf(cwd))
    writeEntries(dir, 'aaa', [
      { type: 'user', cwd: join(cwd, '.claude', 'worktrees', 'wt'), message: prompt },
      { type: 'user', cwd, message: prompt }
    ])

    const [found] = await listProjects()

    expect(found.realPath).toBe(cwd)
  })

  it('worktree-state 엔트리의 worktreeSession.originalCwd 도 후보로 본다', async () => {
    // EnterWorktree 를 쓴 세션은 첫 cwd 부터 워크트리라 originalCwd 가 유일한 단서다
    const cwd = join(root, 'main')
    const worktreePath = join(cwd, '.claude', 'worktrees', 'wt')
    const dir = project(dirNameOf(cwd))
    writeEntries(dir, 'aaa', [
      { type: 'worktree-state', worktreeSession: { originalCwd: cwd, worktreePath } },
      { type: 'user', cwd: worktreePath, message: prompt }
    ])

    const [found] = await listProjects()

    expect(found.realPath).toBe(cwd)
  })

  it('같은 엔트리에 cwd 와 originalCwd 가 다 있으면 디렉터리명과 맞는 쪽을 쓴다', async () => {
    const cwd = join(root, 'main')
    const worktreePath = join(cwd, '.claude', 'worktrees', 'wt')
    const dir = project(dirNameOf(cwd))
    writeEntries(dir, 'aaa', [
      {
        type: 'worktree-state',
        cwd: worktreePath,
        worktreeSession: { originalCwd: cwd, worktreePath }
      },
      { type: 'user', cwd: worktreePath, message: prompt }
    ])

    const [found] = await listProjects()

    expect(found.realPath).toBe(cwd)
  })

  it('맞아떨어지는 cwd 가 없으면 첫 cwd 를 쓴다', async () => {
    const dir = project(dirNameOf(join(root, 'main')))
    const elsewhere = join(root, 'elsewhere')
    writeEntries(dir, 'aaa', [{ type: 'user', cwd: elsewhere, message: prompt }])

    const [found] = await listProjects()

    expect(found.realPath).toBe(elsewhere)
  })

  it('realPath 로 저장소 정보를 채운다', async () => {
    const cwd = join(root, 'main')
    const dir = project(dirNameOf(cwd))
    writeEntries(dir, 'aaa', [{ type: 'user', cwd, message: prompt }])

    const [found] = await listProjects()

    // 저장소 경로는 심볼릭 링크를 푼 값이다
    expect(found.repo).toEqual({ rootPath: join(realpathSync(root), 'main'), sub: null })
  })
})
