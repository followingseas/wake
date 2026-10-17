import { realpath, stat } from 'fs/promises'
import { homedir } from 'os'
import { isAbsolute, join, relative, resolve, sep } from 'path'
import type { SessionProvider } from '../../shared/types'

export function claudeRoot(): string {
  return resolve(process.env.CHV_DATA_DIR ?? join(homedir(), '.claude', 'projects'))
}

export function codexHome(): string {
  return resolve(process.env.CODEX_HOME || join(homedir(), '.codex'))
}

export function codexRoot(): string {
  return join(codexHome(), 'sessions')
}

function inside(root: string, path: string): boolean {
  const rel = relative(root, path)
  return !!rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

/** IPC가 받은 경로는 실제 파일·루트로 검증한다. 심볼릭 링크로 루트 밖을 읽거나 지우지 않는다. */
export async function sessionFileProvider(filePath: string): Promise<SessionProvider | null> {
  if (typeof filePath !== 'string' || !filePath.endsWith('.jsonl')) return null
  const path = resolve(filePath)
  // 파일 시스템에 닿기 전에 경로만으로 루트를 거른다. 렌더러가 보낸 임의 경로(Windows UNC 등)는 조회하지 않는다.
  // 두 루트가 겹치면(CHV_DATA_DIR 아래에 CODEX_HOME) 둘 다 파일의 상위이므로 더 긴 쪽이 더 깊은 루트다
  const [match] = (
    [
      ['claude', claudeRoot()],
      ['codex', codexRoot()]
    ] as const
  )
    .filter(([, root]) => inside(root, path))
    .sort(([, a], [, b]) => b.length - a.length)
  if (!match) return null
  const [provider, root] = match
  const actual = await realpath(path).catch(() => null)
  if (!actual) return null
  const info = await stat(actual).catch(() => null)
  if (!info?.isFile()) return null
  const actualRoot = await realpath(root).catch(() => null)
  return actualRoot && inside(actualRoot, actual) ? provider : null
}
