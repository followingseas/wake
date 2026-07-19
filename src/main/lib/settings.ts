import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import type { AppSettings } from '../../shared/types'

const DEFAULT_SETTINGS: AppSettings = { terminal: 'auto' }

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function loadSettings(): AppSettings {
  try {
    const raw = JSON.parse(readFileSync(settingsPath(), 'utf8'))
    return {
      terminal: typeof raw.terminal === 'string' ? raw.terminal : DEFAULT_SETTINGS.terminal
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): AppSettings {
  const path = settingsPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(settings, null, 2))
  return settings
}
