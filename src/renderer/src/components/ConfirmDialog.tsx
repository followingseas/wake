import type { ReactElement } from 'react'
import { usePrefs } from '../prefs'

interface Props {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel
}: Props): ReactElement {
  const { t } = usePrefs()
  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="dialog__actions">
          <button className="btn" onClick={onCancel} autoFocus>
            {t('common.cancel')}
          </button>
          <button className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
