import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import type { AppSettings, TerminalOption, UpdateInfo } from '../../../shared/types'
import { usePrefs } from '../prefs'

interface Props {
  onClose: () => void
}

function Toggle({
  checked,
  onChange,
  label,
  hint
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  hint?: string
}): ReactElement {
  return (
    <label className="toggle-row">
      <span className="toggle-row__text">
        <span className="toggle-row__label">{label}</span>
        {hint && <span className="toggle-row__hint">{hint}</span>}
      </span>
      <span className={`toggle${checked ? ' is-on' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="toggle__knob" />
      </span>
    </label>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}): ReactElement {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={option.value === value}
          className={`segmented__item${option.value === value ? ' is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'done'; info: UpdateInfo }
  | { phase: 'failed' }

export function SettingsDialog({ onClose }: Props): ReactElement {
  const { t, settings, updateSettings } = usePrefs()
  const [terminals, setTerminals] = useState<TerminalOption[]>([])
  const [version, setVersion] = useState<string | null>(null)
  const [updateState, setUpdateState] = useState<UpdateState>({ phase: 'idle' })

  useEffect(() => {
    window.api.getSettings().then((info) => setTerminals(info.terminals))
    window.api.checkForUpdate().then((info) => setVersion(info.currentVersion))
  }, [])

  const set = (partial: Partial<AppSettings>): void => {
    updateSettings(partial)
  }

  const checkNow = async (): Promise<void> => {
    setUpdateState({ phase: 'checking' })
    try {
      const info = await window.api.checkForUpdate(true)
      setVersion(info.currentVersion)
      if (info.latestVersion === null) setUpdateState({ phase: 'failed' })
      else setUpdateState({ phase: 'done', info })
    } catch {
      setUpdateState({ phase: 'failed' })
    }
  }

  const defaultTerminalLabel = terminals[0]?.label ?? ''

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="dialog dialog--settings" onClick={(event) => event.stopPropagation()}>
        <h2>{t('settings.title')}</h2>

        <Section title={t('settings.general')}>
          <div className="settings-field">
            <span className="settings-field__label">{t('settings.language')}</span>
            <Segmented
              value={settings.language}
              options={[
                { value: 'auto', label: t('settings.language.auto') },
                { value: 'ko', label: '한국어' },
                { value: 'en', label: 'English' }
              ]}
              onChange={(language) => set({ language })}
            />
          </div>
        </Section>

        <Section title={t('settings.terminal')}>
          <p className="settings-section__hint">{t('settings.terminal.hint')}</p>
          <ul className="settings-options">
            <li>
              <label className="settings-option">
                <input
                  type="radio"
                  name="terminal"
                  checked={settings.terminal === 'auto'}
                  onChange={() => set({ terminal: 'auto' })}
                />
                <span className="settings-option__label">{t('settings.terminal.auto')}</span>
                <span className="settings-option__desc">
                  {t('settings.terminal.autoDesc', { name: defaultTerminalLabel })}
                </span>
              </label>
            </li>
            {terminals.map((terminal) => (
              <li key={terminal.id}>
                <label className="settings-option">
                  <input
                    type="radio"
                    name="terminal"
                    checked={settings.terminal === terminal.id}
                    onChange={() => set({ terminal: terminal.id })}
                  />
                  <span className="settings-option__label">{terminal.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('settings.viewer')}>
          <div className="settings-field">
            <span className="settings-field__label">{t('settings.fontScale')}</span>
            <Segmented
              value={settings.fontScale}
              options={[
                { value: 'small', label: t('settings.fontScale.small') },
                { value: 'normal', label: t('settings.fontScale.normal') },
                { value: 'large', label: t('settings.fontScale.large') }
              ]}
              onChange={(fontScale) => set({ fontScale })}
            />
          </div>
          <Toggle
            checked={settings.expandThinking}
            onChange={(expandThinking) => set({ expandThinking })}
            label={t('settings.expandThinking')}
            hint={t('settings.expandThinking.hint')}
          />
          <Toggle
            checked={settings.showMeta}
            onChange={(showMeta) => set({ showMeta })}
            label={t('settings.showMeta')}
            hint={t('settings.showMeta.hint')}
          />
        </Section>

        <Section title={t('settings.updates')}>
          <Toggle
            checked={settings.checkUpdatesOnLaunch}
            onChange={(checkUpdatesOnLaunch) => set({ checkUpdatesOnLaunch })}
            label={t('settings.checkOnLaunch')}
          />
          <div className="settings-update">
            <span className="settings-update__version">
              {t('settings.currentVersion')}: v{version ?? '…'}
            </span>
            {updateState.phase === 'done' && updateState.info.hasUpdate && (
              <button
                className="settings-update__link"
                onClick={() => window.api.openExternal(updateState.info.url)}
              >
                {t('settings.updateAvailable', { v: `v${updateState.info.latestVersion}` })}
              </button>
            )}
            {updateState.phase === 'done' && !updateState.info.hasUpdate && (
              <span className="settings-update__status">{t('settings.upToDate')}</span>
            )}
            {updateState.phase === 'failed' && (
              <span className="settings-update__status">{t('settings.checkFailed')}</span>
            )}
            <button className="btn" onClick={checkNow} disabled={updateState.phase === 'checking'}>
              {updateState.phase === 'checking' ? t('settings.checking') : t('settings.checkNow')}
            </button>
          </div>
        </Section>

        <div className="dialog__actions">
          <button className="btn btn--primary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
