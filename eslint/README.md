# PHONARA Custom ESLint Rules

이 디렉토리는 PHONARA 프로젝트의 **아키텍처 불변성**을 자동으로 보호하기 위한 Custom ESLint 규칙들을 관리합니다.

## 철학

- 사람은 실수할 수 있다.
- AI도 실수할 수 있다.
- 하지만 **시스템은 실수를 허용하지 않아야 한다.**

## 규칙 목록

| 규칙 | 설명 | 중요도 |
|------|------|--------|
| `no-direct-ledger-write` | `ledger_entries`에 직접 insert/update/delete 하는 것을 금지 | ★★★★★ |
| `no-client-reward-calculation` | 클라이언트에서 보상/금액 계산을 금지 (서버에서만 계산) | ★★★★★ |

## 사용 방법

```bash
npx eslint .
```

## CI 연동

이 규칙들은 CI에서 자동으로 실행되어, 아키텍처 위반이 발생하면 PR이 병합되지 않도록 막습니다.

## 규칙 개발 가이드

새로운 규칙을 추가할 때는 다음을 지켜주세요:

1. 규칙 파일은 `eslint/rules/` 안에 생성
2. `index.js`에 등록
3. README.md에 설명 추가
4. 위반 시 명확하고 도움이 되는 메시지 작성
