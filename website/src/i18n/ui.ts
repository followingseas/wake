export const locales = ['ko', 'en'] as const
export type Locale = (typeof locales)[number]

export const ui = {
  ko: {
    'meta.title': 'Wake — Claude Code 세션 뷰어',
    'meta.description':
      'Claude Code가 남긴 대화 기록을 읽기 좋게 보여주는 데스크톱 뷰어. 읽고, 이어가고, 분기하세요.',
    'nav.features': '기능',
    'nav.download': '다운로드',
    'hero.headline1': 'Claude Code 세션을',
    'hero.headline2': '읽고 · 이어가고 · 분기하세요',
    'hero.sub1': 'Claude Code가 남긴 대화 기록을 읽기 좋게 보여주는 데스크톱 뷰어.',
    'hero.sub2':
      '어제 멈춘 그 세션 — 찾아 헤매지 말고, 열자마자 찾고 클릭 한 번으로 그 자리에서 다시 시작하세요.',
    'hero.ctaDownload': 'macOS용 다운로드',
    'hero.ctaGithub': 'GitHub에서 보기',
    'hero.platform': 'macOS (Apple Silicon)',
    'hero.screenshotAlt': 'Wake 대화 뷰어 화면',
    'feature1.title': '대화가 읽기 좋아진다',
    'feature1.body':
      '사용자 입력은 터미널 프롬프트로, 응답은 마크다운으로 — 표와 코드 하이라이트까지. 도구 호출과 사고 과정은 접힌 채 정리되어 대화의 흐름을 방해하지 않습니다.',
    'feature1.alt': 'Wake 대화 화면 — 마크다운으로 조판된 응답',
    'feature2.title': '세션을 바로 찾는다',
    'feature2.body':
      '프로젝트별로 정리된 세션 목록과 ⌘F 검색. 세션 제목·마지막 활동·메시지 수를 한눈에 봅니다.',
    'feature2.alt': 'Wake 사이드바 — 프로젝트별 세션 목록과 검색',
    'feature3.title': '그 자리에서 다시 시작',
    'feature3.body':
      '세션의 원래 작업 디렉토리에서 <code>claude --resume</code>으로 이어가고, <code>--fork-session</code>으로 원본을 보존한 채 새 항로로 분기합니다.',
    'feature3.alt': 'Wake 이어가기와 Fork 메뉴',
    'grid.title': '이런 것도 챙겼습니다',
    'grid.local.title': '100% 로컬',
    'grid.local.body': '대화 기록은 어디로도 전송되지 않습니다.',
    'grid.terminal.title': '터미널 선택',
    'grid.terminal.body': 'OS 기본 터미널은 물론 iTerm2 등 감지된 터미널로 엽니다.',
    'grid.trash.title': '안전한 삭제',
    'grid.trash.body': '세션 파일은 휴지통으로 — 언제든 복구할 수 있습니다.',
    'grid.i18n.title': '한국어 · English',
    'grid.i18n.body': '시스템 언어를 자동 감지합니다.',
    'download.title': '지금 시작하기',
    'download.body': '무료 · 오픈소스. 소스 빌드와 사용법은 README를 참고하세요.',
    'download.readme': 'README 보기',
    'notfound.title': '페이지를 찾을 수 없습니다',
    'notfound.home': '홈으로',
    'footer.issues': '이슈',
    'footer.releases': '릴리스'
  },
  en: {
    'meta.title': 'Wake — Claude Code session viewer',
    'meta.description':
      'A desktop viewer that renders your local Claude Code conversation history beautifully. Read, resume, and fork.',
    'nav.features': 'Features',
    'nav.download': 'Download',
    'hero.headline1': 'Your Claude Code sessions —',
    'hero.headline2': 'read · resume · fork',
    'hero.sub1':
      'A desktop viewer that renders the conversation history Claude Code leaves behind, beautifully.',
    'hero.sub2':
      "That session you left off yesterday — stop digging for it. Open Wake, spot it instantly, and pick up right where you stopped in one click.",
    'hero.ctaDownload': 'Download for macOS',
    'hero.ctaGithub': 'View on GitHub',
    'hero.platform': 'macOS (Apple Silicon)',
    'hero.screenshotAlt': 'Wake conversation viewer',
    'feature1.title': 'Conversations, readable',
    'feature1.body':
      'Prompts render as terminal input, responses as rich markdown — tables and syntax highlighting included. Tool calls and thinking stay collapsed, out of the way.',
    'feature1.alt': 'Wake conversation view with markdown-rendered responses',
    'feature2.title': 'Find any session, fast',
    'feature2.body':
      'Sessions organized per project with ⌘F search. Titles, last activity, and message counts at a glance.',
    'feature2.alt': 'Wake sidebar with per-project session list and search',
    'feature3.title': 'Pick up right where you stopped',
    'feature3.body':
      "Resume with <code>claude --resume</code> in the session's original working directory, or branch off safely with <code>--fork-session</code>.",
    'feature3.alt': 'Wake resume and fork menu',
    'grid.title': 'Also included',
    'grid.local.title': '100% local',
    'grid.local.body': 'Your conversations never leave your machine.',
    'grid.terminal.title': 'Your terminal',
    'grid.terminal.body': 'System default, or detected terminals like iTerm2.',
    'grid.trash.title': 'Safe deletion',
    'grid.trash.body': 'Sessions go to the Trash — recoverable anytime.',
    'grid.i18n.title': '한국어 · English',
    'grid.i18n.body': 'Follows your system language automatically.',
    'download.title': 'Get started',
    'download.body': 'Free & open source. See the README for building from source and usage.',
    'download.readme': 'View README',
    'notfound.title': 'Page not found',
    'notfound.home': 'Back home',
    'footer.issues': 'Issues',
    'footer.releases': 'Releases'
  }
} as const

export function useTranslations(locale: Locale) {
  return function t(key: keyof (typeof ui)['ko']): string {
    return ui[locale][key]
  }
}
