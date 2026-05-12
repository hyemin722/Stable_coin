# 변경/추가한 부분

## 수정한 파일

- `contracts/KUSDC.sol`
  - 단순 ERC-20에서 예시 구조에 가깝게 보강
  - minter 관리, pause, blacklist, burn, permit, authorization 기능 추가

- `contracts/IKUSDC.sol`
  - 예시 인터페이스 형식에 맞춰 함수 목록 확장

- `contracts/CafePayment.sol`
  - 기존 `approve + pay` 방식 유지
  - `payWithAuthorization` 방식 추가
  - whitelist, merchant, fee, withdraw 구조 정리

- `contracts/ICafePayment.sol`
  - `payWithAuthorization` 포함
  - 예시 인터페이스 형식에 맞춰 정리

- `README.md`
  - Nodit 활용 부분 추가
  - Nodit 검증 스크립트 실행법 추가
  - 제출용 캡처 목록 추가

## 새로 추가한 파일

- `scripts/nodit-check.js`
  - Nodit Node API로 chainId, blockNumber, pay receipt, KUSDC balance, whitelist, merchant, feeRate, fee balance 조회

- `scripts/nodit-curl-examples.md`
  - cURL로 Nodit API를 직접 호출하는 예시

- `.env.example`
  - Nodit API Key 환경변수 예시

- `SUBMISSION_CHECKLIST.md`
  - 제출 전 확인 목록
