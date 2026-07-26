<!-- pilot:begin -->
This repository follows the Followingseas Rutter policy package.

## Rules

- [warn] 모든 규약 문서에는 왜(Why)를 함께 적는다.
  - Why: Why 없는 규칙은 지켜지지 않는다 — 사람과 AI가 같은 이유 체계를 공유해야 규약 준수율이 오른다.
- [info] 문서는 사람이 읽기 좋게 쓰되, AI 에이전트가 그대로 실행할 수 있을 만큼 구체적으로 쓴다.
  - Why: 사람용 문서와 기계용 정책이 갈라지면 어느 한쪽이 낡는다 — 같은 문서가 두 독자를 섬겨야 한다.
- [warn] 조직 구조가 바뀌면(저장소 추가·폐지·성격 변경) rutter의 docs/maps 지도를 먼저 갱신한다.
  - Why: 낡은 지도는 좌초를 부른다 — 지도가 현행을 반영해야 나머지 문서와 자동화가 신뢰를 얻는다. 지도 자체는 rutter 저장소에서 관리하며 각 저장소로 내려보내지 않는다.
- [error] 작업 브랜치는 feature/<이름> 형식을 사용한다.
  - Why: GitHub Flow(main 단일 브랜치, PR 머지)의 전제 조건 — 브랜치 이름이 일관돼야 리뷰·추적·자동화 분기가 일관된다. PR 머지 여부는 저장소 보호 규칙이 담당하고, 이 rule은 기계 검증 가능한 이름 규칙만 검사한다.
- [warn] 커밋 메시지는 한글로 작성한다 (코드 식별자·conventional commits 타입은 영어).
  - Why: 조직의 일차 언어로 맥락을 남겨야 사람과 AI 모두 이유를 빠르게 파악한다. PR·문서의 한글 원칙은 docs.dual-audience 등 문서 규약이 담당한다.

See `.pilot/context.md` for the full synthesized conventions.

## Source provenance
- package: Followingseas Rutter@2.0.0
- digest: git:72a2748286b1ea5d010e243e6be363307622dbca
<!-- pilot:end -->
