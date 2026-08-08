import { mkdirSync, mkdtempSync, writeFileSync } from 'fs'
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
