// Conventional Commits 1.0.0 기반 + 한글 커밋 메시지 규칙
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 컨벤션이 정의한 11개 타입만 허용
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'refactor', 'style', 'docs', 'test', 'build', 'ci', 'chore', 'revert']
    ],
    // scope는 클래스·함수명을 허용하므로 대소문자 검사를 하지 않는다 (예: (User), (findAll))
    'scope-case': [0],
    // 제목은 한글 작성이라 영문 대소문자 검사를 하지 않는다
    'subject-case': [0],
    // 제목은 50자 이내, 마침표 금지
    'subject-max-length': [2, 'always', 50],
    'subject-full-stop': [2, 'never', '.'],
    // 타입·스코프 포함 헤더 전체 길이 여유분
    'header-max-length': [2, 'always', 72],
    // 제목·본문·푸터는 각각 빈 줄로 구분 (기본 warning → error 승격)
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always']
  }
}
