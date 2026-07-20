<div align="center">

<img src="assets/logo.svg" width="110" alt="Wake 로고 — 파도 마루의 뱃머리와 W를 그리는 한 획의 물결" />

# Wake

**한국어** · [English](./README.en.md)

**Trace the wake of your Claude Code sessions.**

Claude Code가 로컬에 남긴 대화의 항적을 따라 — 읽고, 이어가고, 분기하세요.

[![Release](https://img.shields.io/github/v/release/followingseas/wake?color=56B7C3&label=release)](https://github.com/followingseas/wake/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/followingseas/wake/total?color=1F7A93&label=downloads)](https://github.com/followingseas/wake/releases)
[![License](https://img.shields.io/badge/license-MIT-0B1F2A)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS-E8F6F2)](https://github.com/followingseas/wake/releases/latest)
[![Conventional Commits](https://img.shields.io/badge/commits-conventional-56B7C3)](https://www.conventionalcommits.org/ko/v1.0.0/)

<img src=".github/assets/hero.png" width="820" alt="Wake 대화 뷰어 화면" />

</div>

---

배가 지나간 자리에 남는 물살의 흔적을 wake(항적)라고 부릅니다. Claude Code와의 모든 대화도 로컬 `~/.claude` 디렉토리에 항적을 남깁니다. **Wake는 그 흔적을 따라가는 데스크톱 뷰어입니다** — 지난 세션을 읽기 좋은 문서로 열람하고, 멈춘 지점에서 다시 이어가고, 새로운 항로로 분기(fork)할 수 있습니다.

모든 동작은 로컬 파일 시스템 안에서만 이루어집니다. 네트워크 요청은 업데이트 확인(GitHub Releases 조회)뿐이며, 대화 기록을 외부로 전송하지 않습니다.

## 주요 기능

- **📜 대화 열람** — 사용자 입력은 터미널 프롬프트 형태로, 응답은 마크다운(표·코드 하이라이트 포함)으로 조판해 표시합니다. 도구 호출·사고 과정·시스템 메시지는 접힌 상태로 정리되어 대화의 흐름을 방해하지 않습니다.
- **🔍 세션 탐색** — 프로젝트별로 정리된 세션 목록과 `⌘F` 검색. 세션 제목·마지막 활동·메시지 수를 한눈에 봅니다.
- **⏩ 터미널에서 이어가기** — 세션의 원래 작업 디렉토리에서 `claude --resume`을 실행해 대화를 이어갑니다.
- **🔱 Fork로 열기** — `--fork-session`으로 원본을 보존한 채 새 세션으로 분기합니다.
- **🖥 터미널 선택** — 기본값은 OS 기본 터미널. 설정에서 iTerm2 등 감지된 터미널을 선택할 수 있습니다.
- **🗑 안전한 삭제** — 세션 파일을 휴지통으로 이동합니다. 언제든 복구할 수 있습니다.
- **🌐 다국어** — 한국어 · English (시스템 언어 자동 감지)

<div align="center">
<img src=".github/assets/settings.png" width="680" alt="Wake 설정 화면" />
</div>

## 설치

### 다운로드 (권장)

[**최신 릴리스 다운로드 →**](https://github.com/followingseas/wake/releases/latest)

`.dmg`를 마운트한 뒤 `Wake.app`을 Applications 폴더로 옮기면 설치가 끝납니다. 현재 macOS(Apple Silicon) 빌드를 제공합니다.

> 서명·공증되지 않은 빌드이므로 첫 실행 시 Gatekeeper 경고가 표시됩니다. 시스템 설정 → 개인정보 보호 및 보안에서 "그래도 열기"를 눌러 허용하십시오.

### 소스에서 실행

```bash
git clone https://github.com/followingseas/wake.git
cd wake
npm install
npm run dev
```

앱으로 빌드하려면:

```bash
npm run build:mac     # macOS (.dmg)
npm run build:win     # Windows (설치형 .exe)
npm run build:linux   # Linux (AppImage, deb)
```

| 요구 사항 | 내용 |
|------|------|
| OS | macOS · Windows · Linux |
| Node.js | 20 이상 (소스 실행/빌드 시) |
| Claude Code CLI | `claude` 명령이 PATH에 있어야 함 (이어가기/Fork 기능) |

> 뷰어 기능은 모든 OS에서 동작합니다. 터미널 연동은 macOS(Terminal.app, iTerm2)에서 검증되었으며, Windows(Windows Terminal, cmd, PowerShell)와 Linux(GNOME Terminal, Konsole 등)는 구현되어 있으나 검증 범위가 제한적입니다. 문제가 있다면 이슈로 알려주십시오.

## 사용법

| 동작 | 방법 |
|------|------|
| 세션 열람 | 사이드바에서 프로젝트 펼침 → 세션 클릭 |
| 상세 펼치기 | 본문의 도구 호출(`▸ Bash …`)·`사고 과정` 줄 클릭 |
| 이어가기 / Fork | 상단 **터미널에서 이어가기** / **Fork로 열기** 버튼 |
| 검색 | `⌘F` — 세션 제목·첫 메시지 대상 |
| 설정 | `⌘,` 또는 사이드바 ⚙ — 언어·터미널·글자 크기·업데이트 |
| 삭제 | **삭제** 버튼 → 확인 후 휴지통 이동 |

## 데이터 처리 방식

- 읽기 대상: `~/.claude/projects/<프로젝트>/<sessionId>.jsonl`
- 대화 열람은 전 과정이 읽기 전용입니다. 원본 파일을 수정하지 않습니다.
- 유일한 쓰기 동작은 사용자가 명시적으로 요청한 삭제이며, 이 또한 파일을 휴지통으로 옮기는 방식으로 동작합니다.
- 설정은 OS 표준 앱 데이터 경로(`userData/settings.json`)에 저장됩니다.

## 알려진 제한

- 세션 JSONL 포맷은 Claude Code의 비공식 내부 포맷입니다. Claude Code 버전에 따라 표시가 달라질 수 있으며, 파서는 알 수 없는 항목을 건너뛰도록 방어적으로 동작합니다.
- 서브에이전트(sidechain) 대화는 현재 개수만 표시하고 본문은 렌더링하지 않습니다.

## 개발

```bash
npm run dev        # HMR 개발 모드
npm run typecheck  # 타입 검사
npm run lint       # ESLint
npm run build      # 타입 검사 + 프로덕션 빌드
```

기술 스택: Electron · electron-vite · React · TypeScript · react-markdown

커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/)를 따르며 commitlint로 검사됩니다.

## 라이선스

[MIT](LICENSE) © [followingseas](https://github.com/followingseas)
