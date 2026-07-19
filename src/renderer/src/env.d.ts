/// <reference types="vite/client" />

import type { ClaudeHistoryApi } from '../../shared/types'

declare global {
  interface Window {
    api: ClaudeHistoryApi
  }
}
