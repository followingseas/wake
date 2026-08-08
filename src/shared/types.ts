export interface WorktreeInfo {
  rootPath: string | null
  rootDirName: string
  name: string
}

export interface ProjectInfo {
  id: string
  dirName: string
  dirPath: string
  realPath: string | null
  name: string
  sessionCount: number
  lastActiveAt: number
  worktree: WorktreeInfo | null
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
  /**
   * 'command'(슬래시 커맨드)·'injected'(주입 컨텍스트)는 label에 내용이 들어가고,
   * 나머지는 kind 기반 번역 라벨을 쓴다.
   * - bashRun: ! 셸 명령 실행. label = 명령어, detail = 출력(뒤따르는 bashOutput 엔트리를 병합)
   * - bashOutput: 짝이 되는 bashRun 없이 단독으로 남은 셸 출력
   * - task: 백그라운드 작업 알림. label = summary
   * - interrupt: 사용자가 Esc로 중단. label = 'tool-use'면 도구 실행 중단
   * - compact: 컨텍스트 요약으로 이어진 세션 경계. detail = 이월된 요약 전문
   */
  kind:
    | 'command'
    | 'output'
    | 'context'
    | 'injected'
    | 'bashRun'
    | 'bashOutput'
    | 'task'
    | 'interrupt'
    | 'compact'
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

export interface SearchSnippet {
  /** 매칭된 ConversationItem의 uuid */
  ref: string
  role: 'user' | 'assistant'
  /** 매칭 앞 문맥 — 잘렸으면 앞에 말줄임표가 붙는다 */
  before: string
  /** 원문 대소문자를 보존한 매칭 부분 */
  match: string
  /** 매칭 뒤 문맥 — 잘렸으면 뒤에 말줄임표가 붙는다 */
  after: string
}

export interface SearchHit {
  sessionId: string
  projectId: string
  filePath: string
  title: string
  updatedAt: number
  /** 세션 전체 매칭 수 — snippets 길이보다 클 수 있다 */
  matchCount: number
  snippets: SearchSnippet[]
}

export interface SearchResults {
  query: string
  hits: SearchHit[]
  /** 세션 수 상한에 걸려 잘렸으면 true */
  truncated: boolean
  /** 최초 인덱스 구축 중이라 부분 결과면 true */
  indexing: boolean
}

export interface SearchProgress {
  /** 처리한 프로젝트 수 */
  done: number
  /** 전체 프로젝트 수 — 집계 전이면 0 */
  total: number
  /** 최초 인덱스 구축이 끝났으면 true */
  ready: boolean
}

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
  onOpenSettings: (callback: () => void) => () => void
  showSessionMenu: (labels: {
    reveal: string
    delete: string
  }) => Promise<'reveal' | 'delete' | null>
  installUpdate: () => Promise<void>
}
