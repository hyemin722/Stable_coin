# GIWA Stablecoin Cafe Payment DApp

## 프로젝트 개요

GIWA Sepolia Testnet 위에서 자체 ERC-20 기반 스테이블코인 `KUSDC`를 배포하고, `CafePayment` 컨트랙트와 상호작용하여 스테이블코인 결제를 수행한 실습입니다.

## 사용 네트워크

- Network: GIWA Sepolia Testnet
- Chain ID: 91342
- Currency Symbol: ETH
- Development Tool: Remix IDE
- Wallet: MetaMask

## 배포한 컨트랙트

- `KUSDC.sol`: 자체 스테이블코인 역할을 하는 ERC-20 토큰 컨트랙트
- `CafePayment.sol`: KUSDC를 이용해 결제를 수행하는 카페 결제 컨트랙트
- `IKUSDC.sol`: KUSDC 인터페이스
- `ICafePayment.sol`: CafePayment 인터페이스

## 작업 순서

1. MetaMask에 GIWA Sepolia Testnet 추가
2. Remix에서 `KUSDC.sol` 컴파일 및 배포
3. `mint` 함수로 내 지갑에 100 KUSDC 발행
4. `balanceOf` 함수로 KUSDC 잔액 확인
5. Remix에서 `CafePayment.sol` 컴파일 및 배포
6. `addWhitelistedToken` 함수로 KUSDC 토큰 주소 등록
7. `approve` 함수로 CafePayment 컨트랙트에 KUSDC 사용 권한 부여
8. `pay` 함수로 KUSDC 결제 실행
9. MetaMask 활동 내역과 Remix 실행 결과로 트랜잭션 성공 확인

## 실행 결과

- KUSDC mint 결과: `100000000`
- decimals: `6`
- 실제 발행량: `100 KUSDC`
- 결제 금액: `10 KUSDC`
- 수수료율: `1%`

## 캡처 자료

작업 완료 캡처는 `screenshots` 폴더에 정리하였습니다.

추천 캡처 파일명:
- `01_metamask_giwa_network.png`
- `02_kusdc_deploy.png`
- `03_kusdc_balanceof.png`
- `04_cafepayment_deploy.png`
- `05_whitelisted_token_true.png`
- `06_approve_success.png`
- `07_pay_success.png`
