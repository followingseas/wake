import type { ReactElement } from 'react'

export function WakeMark({ size = 72 }: { size?: number }): ReactElement {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="wake-mark-w" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7FD1DB" />
          <stop offset="0.5" stopColor="#56B7C3" />
          <stop offset="1" stopColor="#1F7A93" />
        </linearGradient>
      </defs>
      <path
        d="M 104 214 C 118 286 136 354 182 354 C 222 354 238 270 256 240 C 274 270 290 354 330 354 C 376 354 394 286 408 214"
        stroke="url(#wake-mark-w)"
        strokeWidth="54"
        strokeLinecap="round"
      />
      <path
        d="M 234 122 L 278 152 L 234 182"
        stroke="#7FD1DB"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
