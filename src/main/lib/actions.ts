import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { shell } from 'electron'
import type { ActionResult } from '../../shared/types'

function escapeForAppleScript(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function escapeForShell(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`
}

function runInTerminal(command: string): Promise<ActionResult> {
  const script = [
    'tell application "Terminal"',
    'activate',
    `do script "${escapeForAppleScript(command)}"`,
    'end tell'
  ].join('\n')

  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], (error) => {
      if (error) resolve({ ok: false, error: error.message })
      else resolve({ ok: true })
    })
  })
}

function buildResumeCommand(sessionId: string, cwd: string | null, fork: boolean): string {
  const workdir = cwd && existsSync(cwd) ? cwd : homedir()
  const flags = fork ? `--resume ${sessionId} --fork-session` : `--resume ${sessionId}`
  return `cd ${escapeForShell(workdir)} && claude ${flags}`
}

export function resumeSession(sessionId: string, cwd: string | null): Promise<ActionResult> {
  if (process.platform !== 'darwin') {
    return Promise.resolve({ ok: false, error: '터미널 연동은 현재 macOS만 지원합니다.' })
  }
  return runInTerminal(buildResumeCommand(sessionId, cwd, false))
}

export function forkSession(sessionId: string, cwd: string | null): Promise<ActionResult> {
  if (process.platform !== 'darwin') {
    return Promise.resolve({ ok: false, error: '터미널 연동은 현재 macOS만 지원합니다.' })
  }
  return runInTerminal(buildResumeCommand(sessionId, cwd, true))
}

export async function deleteSession(filePath: string): Promise<ActionResult> {
  try {
    await shell.trashItem(filePath)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function revealSession(filePath: string): ActionResult {
  shell.showItemInFolder(filePath)
  return { ok: true }
}
