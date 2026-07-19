import { useEffect, useState, type ReactElement } from 'react'
import type { SettingsInfo } from '../../../shared/types'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export function SettingsDialog({ onClose, onSaved }: Props): ReactElement {
  const [info, setInfo] = useState<SettingsInfo | null>(null)
  const [selected, setSelected] = useState<string>('auto')

  useEffect(() => {
    window.api.getSettings().then((loaded) => {
      setInfo(loaded)
      setSelected(loaded.settings.terminal)
    })
  }, [])

  const save = async (): Promise<void> => {
    await window.api.saveSettings({ terminal: selected })
    onSaved()
  }

  const defaultLabel = info?.terminals[0]?.label ?? '기본 터미널'

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="dialog dialog--settings" onClick={(event) => event.stopPropagation()}>
        <h2>설정</h2>
        <section className="settings-section">
          <h3>세션을 열 터미널</h3>
          <p className="settings-section__hint">
            이어가기 · Fork로 열기가 사용할 터미널을 선택합니다.
          </p>
          {!info && <p className="settings-section__hint">불러오는 중…</p>}
          {info && (
            <ul className="settings-options">
              <li>
                <label className="settings-option">
                  <input
                    type="radio"
                    name="terminal"
                    value="auto"
                    checked={selected === 'auto'}
                    onChange={() => setSelected('auto')}
                  />
                  <span className="settings-option__label">자동</span>
                  <span className="settings-option__desc">OS 기본 터미널 ({defaultLabel})</span>
                </label>
              </li>
              {info.terminals.map((terminal) => (
                <li key={terminal.id}>
                  <label className="settings-option">
                    <input
                      type="radio"
                      name="terminal"
                      value={terminal.id}
                      checked={selected === terminal.id}
                      onChange={() => setSelected(terminal.id)}
                    />
                    <span className="settings-option__label">{terminal.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="dialog__actions">
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn--primary" onClick={save} disabled={!info}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
