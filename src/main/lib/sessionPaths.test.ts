import { realpath, stat } from 'fs/promises'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { codexRoot, sessionFileProvider } from './sessionPaths'

vi.mock('fs/promises', () => ({ realpath: vi.fn(), stat: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(realpath).mockImplementation(async (path) => String(path))
})

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
})

describe('세션 경로 확인 중 파일 변경', () => {
  it('realpath 확인 직후 파일이 사라져도 null을 반환한다', async () => {
    vi.mocked(stat).mockRejectedValue(Object.assign(new Error('gone'), { code: 'ENOENT' }))
    await expect(sessionFileProvider(join(codexRoot(), 'rollout.jsonl'))).resolves.toBeNull()
    expect(stat).toHaveBeenCalledOnce()
  })

  it('stat이 다른 이유로 실패해도 거부된 경로로 처리한다', async () => {
    vi.mocked(stat).mockRejectedValue(Object.assign(new Error('denied'), { code: 'EACCES' }))
    await expect(sessionFileProvider(join(codexRoot(), 'rollout.jsonl'))).resolves.toBeNull()
  })
})

describe('세션 경로의 허용 루트 판별', () => {
  it('허용 루트 밖의 경로는 파일 시스템을 조회하지 않고 null을 반환한다', async () => {
    await expect(sessionFileProvider(join('/', 'elsewhere', 'rollout.jsonl'))).resolves.toBeNull()
    expect(realpath).not.toHaveBeenCalled()
    expect(stat).not.toHaveBeenCalled()
  })

  it('두 루트가 겹치면 더 깊은 루트의 공급자로 판별한다', async () => {
    const base = join('/', 'data')
    vi.stubEnv('CHV_DATA_DIR', base)
    vi.stubEnv('CODEX_HOME', join(base, '.codex'))
    vi.mocked(stat).mockResolvedValue({ isFile: () => true } as Awaited<ReturnType<typeof stat>>)
    await expect(sessionFileProvider(join(codexRoot(), 'rollout.jsonl'))).resolves.toBe('codex')
  })
})
