import { execFile, spawn } from 'child_process'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { delimiter, join } from 'path'
import type { ActionResult, TerminalOption } from '../../shared/types'

function commandExists(binary: string): boolean {
  const paths = (process.env.PATH ?? '').split(delimiter)
  const names = process.platform === 'win32' ? [`${binary}.exe`, binary] : [binary]
  return paths.some((dir) => dir && names.some((name) => existsSync(join(dir, name))))
}

function appExists(appName: string): boolean {
  return (
    existsSync(`/Applications/${appName}.app`) ||
    existsSync(join(homedir(), `Applications/${appName}.app`))
  )
}

/** 현재 OS에서 사용 가능한 터미널 목록. 첫 항목이 OS 기본값이다. */
export function listTerminals(): TerminalOption[] {
  if (process.platform === 'darwin') {
    const options: TerminalOption[] = [{ id: 'terminal-app', label: 'Terminal (macOS 기본)' }]
    if (appExists('iTerm')) options.push({ id: 'iterm', label: 'iTerm2' })
    return options
  }
  if (process.platform === 'win32') {
    const options: TerminalOption[] = []
    if (commandExists('wt')) options.push({ id: 'wt', label: 'Windows Terminal' })
    options.push({ id: 'cmd', label: '명령 프롬프트 (cmd)' })
    options.push({ id: 'powershell', label: 'PowerShell' })
    return options
  }
  const linuxCandidates: [string, string][] = [
    ['gnome-terminal', 'GNOME Terminal'],
    ['konsole', 'Konsole'],
    ['xfce4-terminal', 'Xfce Terminal'],
    ['alacritty', 'Alacritty'],
    ['kitty', 'kitty'],
    ['x-terminal-emulator', '기본 터미널 (x-terminal-emulator)'],
    ['xterm', 'xterm']
  ]
  return linuxCandidates
    .filter(([binary]) => commandExists(binary))
    .map(([id, label]) => ({ id, label }))
}

/** 설정값('auto' 포함)을 실제 실행 가능한 터미널 id로 확정한다. */
export function resolveTerminalId(preferred: string): string | null {
  const available = listTerminals()
  if (available.length === 0) return null
  if (preferred !== 'auto' && available.some((t) => t.id === preferred)) return preferred
  return available[0].id
}

function escapeForAppleScript(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function runOsascript(script: string): Promise<ActionResult> {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], (error) => {
      if (error) resolve({ ok: false, error: error.message })
      else resolve({ ok: true })
    })
  })
}

function spawnDetached(binary: string, args: string[], cwd: string): ActionResult {
  try {
    const child = spawn(binary, args, { cwd, detached: true, stdio: 'ignore' })
    child.unref()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * 지정한 터미널에서 셸 커맨드를 실행한다.
 * command는 호출부에서 이미 이스케이프·검증된 상태여야 한다.
 */
export async function launchInTerminal(
  terminalId: string,
  cwd: string,
  command: string
): Promise<ActionResult> {
  switch (terminalId) {
    case 'terminal-app':
      return runOsascript(
        [
          'tell application "Terminal"',
          'activate',
          `do script "${escapeForAppleScript(command)}"`,
          'end tell'
        ].join('\n')
      )
    case 'iterm':
      return runOsascript(
        [
          'tell application "iTerm"',
          'activate',
          'set newWindow to (create window with default profile)',
          'tell current session of newWindow',
          `write text "${escapeForAppleScript(command)}"`,
          'end tell',
          'end tell'
        ].join('\n')
      )
    case 'wt':
      return spawnDetached(
        'cmd.exe',
        ['/c', 'start', '""', 'wt.exe', '-d', cwd, 'cmd', '/k', command],
        cwd
      )
    case 'cmd':
      return spawnDetached('cmd.exe', ['/c', 'start', '""', 'cmd.exe', '/k', command], cwd)
    case 'powershell':
      return spawnDetached(
        'cmd.exe',
        ['/c', 'start', '""', 'powershell.exe', '-NoExit', '-Command', command],
        cwd
      )
    case 'gnome-terminal':
      return spawnDetached(
        'gnome-terminal',
        ['--working-directory', cwd, '--', 'bash', '-lc', `${command}; exec bash`],
        cwd
      )
    case 'konsole':
      return spawnDetached(
        'konsole',
        ['--workdir', cwd, '-e', 'bash', '-lc', `${command}; exec bash`],
        cwd
      )
    case 'xfce4-terminal':
      return spawnDetached(
        'xfce4-terminal',
        ['--working-directory', cwd, '-x', 'bash', '-lc', `${command}; exec bash`],
        cwd
      )
    case 'alacritty':
      return spawnDetached(
        'alacritty',
        ['--working-directory', cwd, '-e', 'bash', '-lc', `${command}; exec bash`],
        cwd
      )
    case 'kitty':
      return spawnDetached(
        'kitty',
        ['--directory', cwd, 'bash', '-lc', `${command}; exec bash`],
        cwd
      )
    case 'x-terminal-emulator':
    case 'xterm':
      return spawnDetached(terminalId, ['-e', 'bash', '-lc', `${command}; exec bash`], cwd)
    default:
      return { ok: false, error: `지원하지 않는 터미널입니다: ${terminalId}` }
  }
}
