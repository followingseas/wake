import { createContext, useContext } from 'react'
import type { AppSettings } from '../../shared/types'
import type { Lang, Translate } from './i18n'
import { makeTranslate } from './i18n'

export interface Prefs {
  settings: AppSettings
  lang: Lang
  t: Translate
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>
}

export const DEFAULT_SETTINGS: AppSettings = {
  terminal: 'auto',
  language: 'auto',
  fontScale: 'normal',
  expandThinking: false,
  showMeta: true,
  checkUpdatesOnLaunch: true
}

export const PrefsContext = createContext<Prefs>({
  settings: DEFAULT_SETTINGS,
  lang: 'ko',
  t: makeTranslate('ko'),
  updateSettings: async () => {}
})

export function usePrefs(): Prefs {
  return useContext(PrefsContext)
}
