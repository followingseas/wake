import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import type { AppSettings } from '../../shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  terminal: 'auto',
  language: 'auto',
  fontScale: 'normal',
  expandThinking: false,
  showMeta: true,
  checkUpdatesOnLaunch: true
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function loadSettings(): AppSettings {
  try {
    const raw = JSON.parse(readFileSync(settingsPath(), 'utf8')) as Record<string, unknown>
    return {
      terminal: typeof raw.terminal === 'string' ? raw.terminal : DEFAULT_SETTINGS.terminal,
      language: pick(raw.language, ['auto', 'ko', 'en'] as const, DEFAULT_SETTINGS.language),
      fontScale: pick(
        raw.fontScale,
        ['small', 'normal', 'large'] as const,
        DEFAULT_SETTINGS.fontScale
      ),
      expandThinking:
        typeof raw.expandThinking === 'boolean'
          ? raw.expandThinking
          : DEFAULT_SETTINGS.expandThinking,
      showMeta: typeof raw.showMeta === 'boolean' ? raw.showMeta : DEFAULT_SETTINGS.showMeta,
      checkUpdatesOnLaunch:
        typeof raw.checkUpdatesOnLaunch === 'boolean'
          ? raw.checkUpdatesOnLaunch
          : DEFAULT_SETTINGS.checkUpdatesOnLaunch
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const merged = { ...loadSettings(), ...partial }
  const path = settingsPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(merged, null, 2))
  return merged
}
