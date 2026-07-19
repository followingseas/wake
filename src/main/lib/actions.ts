import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join, resolve, sep } from 'path'
import { shell } from 'electron'
import type { ActionResult } from '../../shared/types'
import { projectsRoot } from './scanner'

function isSessionFilePath(filePath: string): boolean {
  const resolved = resolve(filePath)
  return resolved.startsWith(projectsRoot() + sep) && resolved.endsWith('.jsonl')
}

function escapeForAppleScript(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function escapeForShell(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`
}

function isITermInstalled(): boolean {
  return (
    existsSync('/Applications/iTerm.app') || existsSync(join(homedir(), 'Applications/iTerm.app'))
  )
}

function buildITermScript(command: string): string {
  return [
    'tell application "iTerm"',
    'activate',
    'set newWindow to (create window with default profile)',
    'tell current session of newWindow',
    `write text "${escapeForAppleScript(command)}"`,
    'end tell',
    'end tell'
  ].join('\n')
}

function buildTerminalScript(command: string): string {
  return [
    'tell application "Terminal"',
    'activate',
    `do script "${escapeForAppleScript(command)}"`,
    'end tell'
  ].join('\n')
}

function runOsascript(script: string): Promise<ActionResult> {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], (error) => {
      if (error) resolve({ ok: false, error: error.message })
      else resolve({ ok: true })
    })
  })
}

async function runInTerminal(command: string): Promise<ActionResult> {
  // iTerm이 설치되어 있으면 우선 사용하고, 실패하면 기본 Terminal.app으로 폴백한다
  if (isITermInstalled()) {
    const result = await runOsascript(buildITermScript(command))
    if (result.ok) return result
  }
  return runOsascript(buildTerminalScript(command))
}

const SESSION_ID_RE = /^[a-zA-Z0-9-]{1,64}$/

function buildResumeCommand(sessionId: string, cwd: string | null, fork: boolean): string {
  const workdir = cwd && existsSync(cwd) ? cwd : homedir()
  const flags = fork
    ? `--resume ${escapeForShell(sessionId)} --fork-session`
    : `--resume ${escapeForShell(sessionId)}`
  return `cd ${escapeForShell(workdir)} && claude ${flags}`
}

function openInTerminal(
  sessionId: string,
  cwd: string | null,
  fork: boolean
): Promise<ActionResult> {
  if (process.platform !== 'darwin') {
    return Promise.resolve({ ok: false, error: '터미널 연동은 현재 macOS만 지원합니다.' })
  }
  // 세션 ID는 jsonl 파일명에서 유래하므로 셸 삽입을 막기 위해 형식을 강제한다
  if (!SESSION_ID_RE.test(sessionId)) {
    return Promise.resolve({ ok: false, error: '세션 ID 형식이 올바르지 않습니다.' })
  }
  return runInTerminal(buildResumeCommand(sessionId, cwd, fork))
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
