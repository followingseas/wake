# 릴리스 노트 템플릿 · 작성 규칙

릴리스를 만들 때마다 이 문서를 기준으로 노트를 작성한다.

## 작성 규칙

- **헤더는 이모지 + 영어, 본문은 한글 전용.** 영문 번역본은 만들지 않는다
- 섹션은 **해당하는 것만** 골라 쓴다 (빈 섹션 금지)
- 항목은 커밋 나열이 아니라 **"사용자에게 무엇이 달라지는가"** 중심의 문장으로 쓴다
  - 형식: `**{한 줄 요약}** — {부연 설명}`
  - 나쁨: "fix: 드래그 영역 no-drag 지정" / 좋음: "**설정 팝업이 클릭되지 않던 문제 수정** — …"
- `🔧 Internal`은 사용자 체감이 없는 변경(리팩터링·CI·빌드)만 담고, 굳이 쓸 게 없으면 생략한다
- `📦 Installation`은 매 릴리스 하단에 고정한다 (기존 사용자 자동 업데이트 안내 + 신규 설치 안내)
- 마지막 줄에 `**Full Changelog**: compare 링크`
- 버전은 SemVer: `feat` → MINOR, `fix` → PATCH, 단절적 변경 → MAJOR

## 섹션 세트

| 헤더 | 대응 커밋 타입 |
|------|----------------|
| `## ⭐ New Features` | feat |
| `## 🐛 Bug Fixes` | fix |
| `## ⚡ Performance` | perf |
| `## 📔 Documentation` | docs (사용자가 볼 문서일 때만) |
| `## 💥 Breaking Changes` | `!` / BREAKING CHANGE |
| `## 🔧 Internal` | refactor · ci · build · chore |
| `## 📦 Installation (macOS, Apple Silicon)` | 하단 고정 |

## 릴리스 절차

1. 버전 범프(`package.json`, `package-lock.json`)를 PR로 main에 머지한다
2. `git tag vX.Y.Z && git push origin vX.Y.Z`
3. GitHub Actions가 빌드 → 서명 → 공증 → **draft 릴리스**에 자산(dmg·zip·latest-mac.yml·blockmap)을 업로드한다 (약 20분)
4. draft 릴리스에 아래 템플릿으로 노트를 작성하고 **Publish** 한다
   - publish 되는 순간부터 기존 사용자에게 자동 업데이트가 배포된다

## 템플릿

```markdown
## ⭐ New Features
- **{한 줄 요약}** — {사용자 관점 부연 설명}

## 🐛 Bug Fixes
- **{한 줄 요약}** — {어떤 상황에서 무엇이 잘못됐고 어떻게 좋아졌는지}

## 🔧 Internal
- {사용자 체감 없는 변경 요약}

## 📦 Installation (macOS, Apple Silicon)
- **기존 사용자**: 앱이 알아서 업데이트를 안내합니다 — "지금 재시작" 한 번이면 끝입니다
- **신규 설치**: `wake-X.Y.Z.dmg`를 받아 Applications로 옮기면 됩니다. 서명·공증 빌드라 경고 없이 바로 열립니다

**Full Changelog**: https://github.com/followingseas/wake/compare/v{이전}...v{현재}
```
