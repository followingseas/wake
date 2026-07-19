# Claude History Viewer

로컬에 저장된 Claude Code 대화 기록을 열람하는 macOS 데스크톱 앱입니다.

Claude Code는 모든 대화 세션을 `~/.claude/projects/` 아래에 JSONL 파일로 남기지만, 이를 다시 읽을 수 있는 수단은 터미널의 `/resume` 피커뿐입니다. Claude History Viewer는 이 기록을 읽기 좋은 문서 형태로 렌더링하고, 원하는 세션을 그 자리에서 터미널로 이어가거나 분기(fork)할 수 있게 합니다.

모든 동작은 로컬 파일 시스템 안에서만 이루어집니다. 네트워크 요청을 보내지 않으며, 대화 기록을 외부로 전송하지 않습니다.

## 주요 기능

- **세션 탐색** — 프로젝트별로 정리된 세션 목록을 제공합니다. 세션 제목, 마지막 활동 시각, 메시지 수를 표시하며 `⌘F`로 전체 세션을 검색할 수 있습니다.
- **대화 열람** — 사용자 입력은 터미널 프롬프트 형태로, 응답은 마크다운(표·코드 하이라이트 포함)으로 조판해 표시합니다. 도구 호출·사고 과정·시스템 메시지는 접힌 상태로 정리되어 대화의 흐름을 방해하지 않습니다.
- **터미널에서 이어가기** — 세션의 작업 디렉토리에서 `claude --resume <sessionId>`를 실행해 대화를 이어갑니다.
- **Fork로 열기** — `--fork-session` 플래그로 원본을 보존한 채 새 세션으로 분기합니다.
- **세션 삭제** — 세션 파일을 휴지통으로 이동합니다. 영구 삭제가 아니므로 휴지통에서 복구할 수 있습니다.

## 요구 사항

| 항목 | 버전 |
|------|------|
| macOS | 13 이상 권장 |
| Node.js | 20 이상 |
| Claude Code CLI | `claude` 명령이 PATH에 있어야 함 (이어가기/Fork 기능) |

> 앱 자체는 Windows/Linux에서도 빌드되지만, 터미널 연동(이어가기·Fork)은 현재 macOS(Terminal.app)만 지원합니다.

## 설치 및 실행

### 개발 모드로 실행

```bash
git clone https://github.com/jeongph/claude-history-viewer.git
cd claude-history-viewer
npm install
npm run dev
```

### 앱으로 빌드

```bash
npm run build:mac
```

빌드가 완료되면 `dist/` 디렉토리에 `.dmg` 파일이 생성됩니다. 마운트 후 `Claude History Viewer.app`을 Applications 폴더로 옮기면 설치가 끝납니다.

> 코드 서명 없이 빌드되므로, 처음 실행할 때 macOS Gatekeeper 경고가 표시될 수 있습니다. 시스템 설정 → 개인정보 보호 및 보안에서 실행을 허용하십시오.

## 사용법

1. **세션 선택** — 왼쪽 사이드바에서 프로젝트를 펼치고 세션을 클릭합니다. 프로젝트는 최근 활동 순으로 정렬됩니다.
2. **대화 읽기** — 본문에서 도구 호출(`▸ Bash …`)이나 `사고 과정` 줄을 클릭하면 상세 내용이 펼쳐집니다.
3. **이어가기 / Fork** — 상단의 **터미널에서 이어가기** 버튼은 해당 세션을 그대로 재개하고, **Fork로 열기** 버튼은 새 세션 ID로 분기합니다. 두 경우 모두 터미널(iTerm2가 있으면 iTerm2, 없으면 Terminal.app)이 세션의 원래 작업 디렉토리에서 열립니다.
4. **삭제** — **삭제** 버튼을 누르면 확인 후 세션 파일을 휴지통으로 이동합니다.
5. **검색** — `⌘F`를 누르면 검색창에 포커스가 이동하며, 세션 제목과 첫 메시지를 대상으로 필터링합니다.

## 데이터 처리 방식

- 읽기 대상: `~/.claude/projects/<프로젝트>/<sessionId>.jsonl`
- 대화 열람은 전 과정이 읽기 전용입니다. 원본 파일을 수정하지 않습니다.
- 유일한 쓰기 동작은 사용자가 명시적으로 요청한 삭제이며, 이 또한 파일을 휴지통으로 옮기는 방식으로 동작합니다.

## 알려진 제한

- 세션 JSONL 포맷은 Claude Code의 비공식 내부 포맷입니다. Claude Code 버전에 따라 표시가 달라질 수 있으며, 파서는 알 수 없는 항목을 건너뛰도록 방어적으로 동작합니다.
- 서브에이전트(sidechain) 대화는 현재 개수만 표시하고 본문은 렌더링하지 않습니다.
- 터미널 연동은 iTerm2가 설치되어 있으면 iTerm2를, 없으면 macOS 기본 Terminal.app을 사용합니다. 그 외 터미널(Warp, Alacritty 등) 지원은 예정되어 있습니다.

## 개발

```bash
npm run dev        # HMR 개발 모드
npm run typecheck  # 타입 검사
npm run lint       # ESLint
npm run build      # 타입 검사 + 프로덕션 빌드
```

기술 스택: Electron · electron-vite · React · TypeScript · react-markdown

## 라이선스

[MIT](LICENSE)
