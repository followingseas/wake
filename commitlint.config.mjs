export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 제목은 한글 기준 50자 이내 컨벤션이지만 타입·스코프 포함 여유를 둔다
    'header-max-length': [2, 'always', 72],
    'subject-case': [0]
  }
}
