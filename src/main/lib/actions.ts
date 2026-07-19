import { existsSync } from 'fs'
import { homedir } from 'os'
import { resolve, sep } from 'path'
import { shell } from 'electron'
import type { ActionResult } from '../../shared/types'
import { projectsRoot } from './scanner'
import { loadSettings } from './settings'
import { launchInTerminal, resolveTerminalId } from './terminals'

function isSessionFilePath(filePath: string): boolean {
  const resolved = resolve(filePath)
  return resolved.startsWith(projectsRoot() + sep) && resolved.endsWith('.jsonl')
}

function escapeForShell(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`
}

const SESSION_ID_RE = /^[a-zA-Z0-9-]{1,64}$/

async function openInTerminal(
  sessionId: string,
  cwd: string | null,
  fork: boolean
): Promise<ActionResult> {
  // 세션 ID는 jsonl 파일명에서 유래하므로 셸 삽입을 막기 위해 형식을 강제한다
  if (!SESSION_ID_RE.test(sessionId)) {
    return { ok: false, error: '세션 ID 형식이 올바르지 않습니다.' }
  }
  const terminalId = resolveTerminalId(loadSettings().terminal)
  if (!terminalId) {
    return { ok: false, error: '사용 가능한 터미널을 찾지 못했습니다.' }
  }

  const workdir = cwd && existsSync(cwd) ? cwd : homedir()
  const flags = fork ? `--resume ${sessionId} --fork-session` : `--resume ${sessionId}`
  // Windows 터미널은 spawn cwd로 작업 디렉토리를 잡으므로 cd를 붙이지 않는다
  const command =
    process.platform === 'win32'
      ? `claude ${flags}`
      : `cd ${escapeForShell(workdir)} && claude ${flags}`

  return launchInTerminal(terminalId, workdir, command)
}

export function resumeSession(sessionId: string, cwd: string | null): Promise<ActionResult> {
  return openInTerminal(sessionId, cwd, false)
}

export function forkSession(sessionId: string, cwd: string | null): Promise<ActionResult> {
  return openInTerminal(sessionId, cwd, true)
}

export async function deleteSession(filePath: string): Promise<ActionResult> {
  if (!isSessionFilePath(filePath)) {
    return { ok: false, error: '세션 파일 경로가 아닙니다.' }
  }
  try {
    await shell.trashItem(filePath)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function revealSession(filePath: string): ActionResult {
  if (!isSessionFilePath(filePath)) {
    return { ok: false, error: '세션 파일 경로가 아닙니다.' }
  }
  shell.showItemInFolder(filePath)
  return { ok: true }
}
