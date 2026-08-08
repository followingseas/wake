import { mkdir, readdir, readFile, rename, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { app, type BrowserWindow } from 'electron'
import type { SearchHit, SearchProgress, SearchResults, SessionMeta } from '../../shared/types'
import { listSessions, projectsRoot } from './scanner'
import { parseConversation } from './parser'
import { extractSearchMessages, type SearchMessage } from './searchExtract'
import { indexMessages, matchDocument, type SearchDocument } from './searchMatch'

/** 스키마가 바뀌면 올린다 — 값이 다르면 저장된 인덱스를 버리고 다시 만든다 */
const INDEX_VERSION = 1
const MAX_SNIPPETS_PER_SESSION = 5
const MAX_HITS = 200
/** 검색이 들어올 때마다 전체 정합을 돌리지 않도록 두는 최소 간격 */
const RECONCILE_INTERVAL_MS = 5000
/** 첫 화면 로딩과 CPU를 다투지 않도록 인덱싱 시작을 미루는 시간 */
const INDEX_START_DELAY_MS = 1500

/** 디스크에 저장하는 형태 — 소문자 사본은 적재할 때 다시 만든다 */
interface StoredDocument {
  sessionId: string
  projectId: string
  filePath: string
  title: string
  updatedAt: number
  fileSize: number
  messages: SearchMessage[]
}

const documents = new Map<string, SearchDocument>()
let ready = false
let progress: SearchProgress = { done: 0, total: 0, ready: false }
let running: Promise<void> | null = null
let lastReconcileAt = 0
let progressWindow: BrowserWindow | null = null

function indexPath(): string {
  return join(app.getPath('userData'), 'search-index.jsonl')
}

function emitProgress(): void {
  if (progressWindow && !progressWindow.isDestroyed()) {
    progressWindow.webContents.send('search:progress', progress)
  }
}

function isStoredDocument(value: unknown): value is StoredDocument {
  const stored = value as StoredDocument | null
  return (
    !!stored &&
    typeof stored.sessionId === 'string' &&
    typeof stored.projectId === 'string' &&
    typeof stored.filePath === 'string' &&
    typeof stored.title === 'string' &&
    typeof stored.updatedAt === 'number' &&
    typeof stored.fileSize === 'number' &&
    Array.isArray(stored.messages)
  )
}

async function loadFromDisk(): Promise<void> {
  const raw = await readFile(indexPath(), 'utf8').catch(() => '')
  if (!raw) return
  const lines = raw.split('\n')
  let version: unknown
  try {
    version = (JSON.parse(lines[0]) as { v?: unknown }).v
  } catch {
    // 헤더를 읽을 수 없으면 인덱스를 통째로 버리고 다시 만든다
    return
  }
  if (version !== INDEX_VERSION) return
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    try {
      const stored: unknown = JSON.parse(line)
      if (!isStoredDocument(stored)) continue
      documents.set(stored.filePath, { ...stored, messages: indexMessages(stored.messages) })
    } catch {
      // 줄 하나가 깨져도 나머지는 살린다 (forEachJsonlLine과 같은 관용)
      continue
    }
  }
}

async function persist(): Promise<void> {
  const path = indexPath()
  const temporary = `${path}.tmp`
  const lines = [JSON.stringify({ v: INDEX_VERSION })]
  for (const document of documents.values()) {
    const stored: StoredDocument = {
      sessionId: document.sessionId,
      projectId: document.projectId,
      filePath: document.filePath,
      title: document.title,
      updatedAt: document.updatedAt,
      fileSize: document.fileSize,
      messages: document.messages.map(({ ref, role, text }) => ({ ref, role, text }))
    }
    lines.push(JSON.stringify(stored))
  }
  await mkdir(dirname(path), { recursive: true })
  // 부분 기록된 인덱스를 남기지 않도록 임시 파일에 쓰고 원자적으로 바꿔 끼운다
  await writeFile(temporary, lines.join('\n'))
  await rename(temporary, path)
}

async function listProjectIds(): Promise<string[]> {
  const dirents = await readdir(projectsRoot(), { withFileTypes: true }).catch(() => [])
  return dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name)
}

async function buildDocument(meta: SessionMeta): Promise<SearchDocument | null> {
  // 세션 하나가 깨져도 나머지 인덱싱은 계속한다
  const conversation = await parseConversation(meta.filePath).catch(() => null)
  if (!conversation) return null
  const messages = extractSearchMessages(conversation)
  if (messages.length === 0) return null
  return {
    sessionId: meta.id,
    projectId: meta.projectId,
    filePath: meta.filePath,
    title: meta.title,
    updatedAt: meta.updatedAt,
    fileSize: meta.fileSize,
    messages: indexMessages(messages)
  }
}

async function reconcile(): Promise<void> {
  const projectIds = await listProjectIds()
  progress = { done: 0, total: projectIds.length, ready }
  emitProgress()

  const seen = new Set<string>()
  let changed = false

  for (const projectId of projectIds) {
    const metas = await listSessions(projectId).catch(() => [] as SessionMeta[])
    for (const meta of metas) {
      seen.add(meta.filePath)
      const existing = documents.get(meta.filePath)
      // updatedAt(마지막 엔트리 시각)과 fileSize가 모두 같으면 내용이 그대로다
      if (
        existing &&
        existing.updatedAt === meta.updatedAt &&
        existing.fileSize === meta.fileSize
      ) {
        continue
      }
      const document = await buildDocument(meta)
      if (document) documents.set(meta.filePath, document)
      else documents.delete(meta.filePath)
      changed = true
    }
    progress = { done: progress.done + 1, total: projectIds.length, ready }
    emitProgress()
    // 인덱싱이 렌더러의 IPC를 굶기지 않도록 프로젝트 사이에서 이벤트 루프를 넘긴다
    await new Promise((resolve) => setImmediate(resolve))
  }

  for (const filePath of [...documents.keys()]) {
    if (seen.has(filePath)) continue
    documents.delete(filePath)
    changed = true
  }

  ready = true
  lastReconcileAt = Date.now()
  progress = { ...progress, ready: true }
  emitProgress()
  if (changed) {
    await persist().catch((error) => console.error('[search] 인덱스 저장 실패', error))
  }
}

function ensureIndex(): Promise<void> {
  if (!running) {
    running = (async () => {
      try {
        if (!ready) await loadFromDisk()
        await reconcile()
      } catch (error) {
        // 정합 내부는 파일 단위로 이미 방어돼 있다. 여기까지 온 예외는 검색을 영영
        // "인덱싱 중"에 묶어두지 않도록 준비 완료로 표시하고 다음 요청에서 다시 시도한다.
        console.error('[search] 인덱싱 실패', error)
        ready = true
        lastReconcileAt = Date.now()
        progress = { ...progress, ready: true }
        emitProgress()
      }
    })().finally(() => {
      running = null
    })
  }
  return running
}

export function initSearchIndex(window: BrowserWindow): void {
  progressWindow = window
  setTimeout(() => void ensureIndex(), INDEX_START_DELAY_MS)
}

export async function searchSessions(query: string): Promise<SearchResults> {
  const trimmed = query.trim()
  if (!trimmed) return { query: trimmed, hits: [], truncated: false, indexing: !ready }

  if (!ready) {
    // 구축 중이면 기다리지 않고 지금까지 만들어진 만큼으로 답한다
    void ensureIndex()
  } else if (Date.now() - lastReconcileAt > RECONCILE_INTERVAL_MS) {
    await ensureIndex()
  }

  const lowered = trimmed.toLowerCase()
  const hits: SearchHit[] = []
  for (const document of documents.values()) {
    const hit = matchDocument(document, lowered, MAX_SNIPPETS_PER_SESSION)
    if (hit) hits.push(hit)
  }
  hits.sort((a, b) => b.updatedAt - a.updatedAt)

  return {
    query: trimmed,
    hits: hits.slice(0, MAX_HITS),
    truncated: hits.length > MAX_HITS,
    indexing: !ready
  }
}
