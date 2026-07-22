import { readdir, stat } from 'fs/promises'
import { homedir } from 'os'
import { basename, join } from 'path'
import type { ProjectInfo, SessionMeta, WorktreeInfo } from '../../shared/types'
import { forEachJsonlLine, readHead } from './jsonl'
import { getMessage, isRealUserPrompt, summarize } from './entries'

export function projectsRoot(): string {
  // CHV_DATA_DIR: 개발·데모용 데이터 디렉토리 오버라이드
  return process.env.CHV_DATA_DIR ?? join(homedir(), '.claude', 'projects')
}

async function detectRealPath(sessionFiles: string[]): Promise<string | null> {
  for (const file of sessionFiles) {
    const head = await readHead(file, 32 * 1024).catch(() => '')
    for (const line of head.split('\n')) {
      if (!line.includes('"cwd"')) continue
      try {
        const entry = JSON.parse(line)
        if (typeof entry.cwd === 'string' && entry.cwd) return entry.cwd
      } catch {
        continue
      }
    }
  }
  return null
}

// 실제 대화(사용자 프롬프트 또는 어시스턴트 메시지)가 있는 세션인지 확인한다.
// 첫 실제 메시지를 찾는 즉시 스트리밍을 중단하므로, 대부분의 세션은 앞쪽 몇 KB만 읽는다.
// listSessions의 messageCount > 0 필터와 동일한 판정 기준을 사용해 카운트가 어긋나지 않게 한다.
async function hasRealMessage(filePath: string): Promise<boolean> {
  let found = false
  await forEachJsonlLine(filePath, (entry) => {
    if (entry.type === 'user') {
      if (isRealUserPrompt(entry)) {
        found = true
        return false
      }
    } else if (entry.type === 'assistant' && entry.isSidechain !== true) {
      if (typeof getMessage(entry)?.id === 'string') {
        found = true
        return false
      }
    }
    return undefined
  })
  return found
}

// Claude Code 워크트리(.claude/worktrees/<name>) 세션인지 판별한다.
// realPath가 우선이고, cwd 기록이 없는 세션은 디렉토리명 패턴으로 폴백한다.
function detectWorktree(dirName: string, realPath: string | null): WorktreeInfo | null {
  const dirMarker = '--claude-worktrees-'
  const pathMarker = '/.claude/worktrees/'
  let rootPath: string | null = null
  let name: string | null = null
  if (realPath) {
    const idx = realPath.indexOf(pathMarker)
    if (idx !== -1) {
      rootPath = realPath.slice(0, idx)
      name = realPath.slice(idx + pathMarker.length).split('/')[0] || null
    }
  }
  const dirIdx = dirName.indexOf(dirMarker)
  const rootDirName = dirIdx !== -1 ? dirName.slice(0, dirIdx) : ''
  if (name === null && dirIdx !== -1) name = dirName.slice(dirIdx + dirMarker.length) || null
  if (name === null) return null
  return { rootPath, rootDirName, name }
}

export async function listProjects(): Promise<ProjectInfo[]> {
  const root = projectsRoot()
  const dirents = await readdir(root, { withFileTypes: true }).catch(() => [])
  const projects: ProjectInfo[] = []

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue
    const dirPath = join(root, dirent.name)
    const files = await readdir(dirPath).catch(() => [])
    const sessionFiles: { path: string; mtimeMs: number }[] = []
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue
      const filePath = join(dirPath, file)
      const info = await stat(filePath).catch(() => null)
      if (!info || info.size === 0) continue
      if (!(await hasRealMessage(filePath).catch(() => false))) continue
      sessionFiles.push({ path: filePath, mtimeMs: info.mtimeMs })
    }
    if (sessionFiles.length === 0) continue

    sessionFiles.sort((a, b) => b.mtimeMs - a.mtimeMs)
    const realPath = await detectRealPath(sessionFiles.slice(0, 3).map((f) => f.path))
    projects.push({
      id: dirent.name,
      dirName: dirent.name,
      dirPath,
      realPath,
      name: realPath
        ? basename(realPath)
        : (dirent.name.split('-').filter(Boolean).pop() ?? dirent.name),
      sessionCount: sessionFiles.length,
      lastActiveAt: sessionFiles[0].mtimeMs,
      worktree: detectWorktree(dirent.name, realPath)
    })
  }

  return projects.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
}

interface MetaCacheEntry {
  mtimeMs: number
  size: number
  meta: SessionMeta
}

const metaCache = new Map<string, MetaCacheEntry>()

async function readSessionMeta(
  projectId: string,
  filePath: string,
  mtimeMs: number,
  size: number
): Promise<SessionMeta> {
  const cached = metaCache.get(filePath)
  if (cached && cached.mtimeMs === mtimeMs && cached.size === size) return cached.meta

  let title: string | null = null
  let summaryTitle: string | null = null
  let firstPrompt: string | null = null
  let firstTimestamp: string | null = null
  let lastTimestamp: string | null = null
  let gitBranch: string | null = null
  let cwd: string | null = null
  let userCount = 0
  const assistantMessageIds = new Set<string>()

  await forEachJsonlLine(filePath, (entry) => {
    if (entry.type === 'ai-title' && typeof entry.aiTitle === 'string') {
      title = entry.aiTitle
      return
    }
    if (entry.type === 'summary' && typeof entry.summary === 'string') {
      summaryTitle = entry.summary
      return
    }
    if (typeof entry.timestamp === 'string') {
      firstTimestamp ??= entry.timestamp
      lastTimestamp = entry.timestamp
    }
    if (typeof entry.gitBranch === 'string' && entry.gitBranch) gitBranch = entry.gitBranch
    if (typeof entry.cwd === 'string' && entry.cwd) cwd = entry.cwd

    if (entry.type === 'user') {
      const prompt = isRealUserPrompt(entry)
      if (prompt) {
        userCount += 1
        firstPrompt ??= summarize(prompt, 120)
      }
    } else if (entry.type === 'assistant' && entry.isSidechain !== true) {
      const id = getMessage(entry)?.id
      if (typeof id === 'string') assistantMessageIds.add(id)
    }
  })

  const meta: SessionMeta = {
    id: basename(filePath, '.jsonl'),
    projectId,
    filePath,
    title: title ?? summaryTitle ?? firstPrompt ?? '(빈 세션)',
    firstPrompt,
    messageCount: userCount + assistantMessageIds.size,
    createdAt: firstTimestamp ? Date.parse(firstTimestamp) : null,
    updatedAt: lastTimestamp ? Date.parse(lastTimestamp) : mtimeMs,
    gitBranch,
    cwd,
    fileSize: size
  }
  metaCache.set(filePath, { mtimeMs, size, meta })
  return meta
}

export async function listSessions(projectId: string): Promise<SessionMeta[]> {
  const dirPath = join(projectsRoot(), projectId)
  const files = await readdir(dirPath).catch(() => [])
  const metas: SessionMeta[] = []
  for (const file of files) {
    if (!file.endsWith('.jsonl')) continue
    const filePath = join(dirPath, file)
    const info = await stat(filePath).catch(() => null)
    if (!info || info.size === 0) continue
    metas.push(await readSessionMeta(projectId, filePath, info.mtimeMs, info.size))
  }
  return metas.filter((meta) => meta.messageCount > 0).sort((a, b) => b.updatedAt - a.updatedAt)
}
