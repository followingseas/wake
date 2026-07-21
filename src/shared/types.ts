export interface ProjectInfo {
  id: string
  dirName: string
  dirPath: string
  realPath: string | null
  name: string
  sessionCount: number
  lastActiveAt: number
}

export interface SessionMeta {
  id: string
  projectId: string
  filePath: string
  title: string
  firstPrompt: string | null
  messageCount: number
  createdAt: number | null
  updatedAt: number
  gitBranch: string | null
  cwd: string | null
  fileSize: number
}

export type AssistantBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | {
      type: 'toolCall'
      id: string
      name: string
      input: unknown
      result: string | null
      isError: boolean
    }

export interface UserImage {
  mediaType: string
  data: string
}

export interface UserMetaInfo {
  /** 'command'는 label에 커맨드명이 들어가고, 나머지는 kind 기반 번역 라벨을 쓴다 */
  kind: 'command' | 'output' | 'context' | 'injected'
  label: string | null
  detail: string | null
}

export type ConversationItem =
  | {
      kind: 'user'
      uuid: string
      timestamp: string | null
      text: string
      images: UserImage[]
      meta: UserMetaInfo | null
    }
  | {
      kind: 'assistant'
      uuid: string
      timestamp: string | null
      blocks: AssistantBlock[]
    }

export interface Conversation {
  sessionId: string
  items: ConversationItem[]
  sidechainCount: number
  hiddenCount: number
}

export interface ActionResult {
  ok: boolean
  error?: string
}

export interface TerminalOption {
  id: string
  label: string
}

export interface AppSettings {
  /** 'auto'면 OS 기본 터미널을 사용한다 */
  terminal: string
  /** 'auto'면 시스템 언어를 따른다 */
  language: 'auto' | 'ko' | 'en'
  fontScale: 'small' | 'normal' | 'large'
  expandThinking: boolean
  showMeta: boolean
  checkUpdatesOnLaunch: boolean
}

export interface SettingsInfo {
  settings: AppSettings
  terminals: TerminalOption[]
}

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string | null
  hasUpdate: boolean
  url: string
  /** true면 electron-updater가 다운로드·설치를 관리한다 (배너는 update:event로 구동) */
  auto: boolean
}

export type UpdateEvent =
  | { type: 'downloading'; version: string; percent: number }
  | { type: 'ready'; version: string }
  | { type: 'error'; message: string }

export interface ClaudeHistoryApi {
  listProjects: () => Promise<ProjectInfo[]>
  listSessions: (projectId: string) => Promise<SessionMeta[]>
  loadConversation: (filePath: string) => Promise<Conversation>
  resumeSession: (sessionId: string, cwd: string | null) => Promise<ActionResult>
  forkSession: (sessionId: string, cwd: string | null) => Promise<ActionResult>
  deleteSession: (filePath: string) => Promise<ActionResult>
  revealSession: (filePath: string) => Promise<ActionResult>
  openExternal: (url: string) => Promise<void>
  getSettings: () => Promise<SettingsInfo>
  saveSettings: (settings: Partial<AppSettings>) => Promise<SettingsInfo>
  checkForUpdate: (force?: boolean) => Promise<UpdateInfo>
  onUpdateEvent: (callback: (event: UpdateEvent) => void) => () => void
  installUpdate: () => Promise<void>
}
