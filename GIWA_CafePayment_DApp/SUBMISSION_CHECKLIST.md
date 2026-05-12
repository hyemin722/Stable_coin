# 제출 전 체크리스트

## 최소로 추가해야 하는 것

- [ ] Nodit API Key 발급
- [ ] `scripts/nodit-check.js` 실행
- [ ] Nodit 결과 캡처 추가
- [ ] README에 Nodit 활용 부분 포함

## Remix에서 다시 배포할 경우

- [ ] `contracts/KUSDC.sol` 컴파일 및 배포
- [ ] `mint(내 지갑주소, 100000000)` 실행
- [ ] `contracts/CafePayment.sol` 컴파일 및 배포
- [ ] 생성자 입력: `merchant`, `feeRate = 100`
- [ ] `addWhitelistedToken(KUSDC 주소)` 실행
- [ ] `KUSDC.approve(CafePayment 주소, 10000000)` 실행
- [ ] `CafePayment.pay(KUSDC 주소, 10000000)` 실행
- [ ] MetaMask pay 트랜잭션 해시 복사
- [ ] Nodit 스크립트로 트랜잭션 receipt 및 컨트랙트 상태 조회

## 제출 파일 구성 추천

```text
contracts/
  KUSDC.sol
  IKUSDC.sol
  CafePayment.sol
  ICafePayment.sol
scripts/
  nodit-check.js
  nodit-curl-examples.md
README.md
screenshots/
  01_metamask_giwa_network.png
  02_kusdc_deploy.png
  03_kusdc_balanceof.png
  04_cafepayment_deploy.png
  05_whitelisted_token_true.png
  06_approve_success.png
  07_pay_success.png
  08_nodit_chainid_and_receipt.png
  09_nodit_contract_state.png
```
