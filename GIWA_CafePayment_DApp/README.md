# GIWA Stablecoin Cafe Payment DApp

## 프로젝트 개요

GIWA Sepolia Testnet 위에서 자체 ERC-20 기반 스테이블코인 `KUSDC`를 배포하고, `CafePayment` 컨트랙트와 상호작용하여 스테이블코인 결제를 수행한 실습입니다.

이번 프로젝트는 다음 3가지를 목표로 구현했습니다.

1. GIWA Sepolia Testnet 사용
2. 나만의 스테이블코인 `KUSDC` 배포
3. `CafePayment` 컨트랙트와 상호작용하여 KUSDC 결제 수행
4. Nodit Node API로 배포/결제 결과 조회

## 사용 네트워크 및 도구

- Network: GIWA Sepolia Testnet
- Chain ID: `91342`
- Currency Symbol: `ETH`
- Wallet: MetaMask
- Smart Contract IDE: Remix IDE
- Blockchain API: Nodit Node API
- Nodit Node API Endpoint: `https://giwa-sepolia.nodit.io/`

## 배포한 컨트랙트

- `KUSDC.sol`
  - 자체 스테이블코인 역할을 하는 ERC-20 토큰 컨트랙트
  - `decimals = 6`
  - mint, burn, minter 관리, pause, blacklist, permit, authorization 기능 포함

- `CafePayment.sol`
  - KUSDC를 이용해 결제를 수행하는 카페 결제 컨트랙트
  - 결제 가능 토큰 whitelist 관리
  - merchant 주소 관리
  - 수수료율 관리
  - `approve + pay` 방식 결제 지원
  - `payWithAuthorization` 방식 결제 지원

- `IKUSDC.sol`
  - KUSDC 인터페이스

- `ICafePayment.sol`
  - CafePayment 인터페이스

## 주요 기능

### 1. KUSDC 발행

`KUSDC`는 USDC와 유사하게 `decimals`를 6으로 설정했습니다.

예시:

```text
100 KUSDC = 100000000
10 KUSDC = 10000000
0.1 KUSDC = 100000
```

### 2. CafePayment 결제

`CafePayment`는 다음 흐름으로 결제를 처리합니다.

1. Owner가 결제 가능한 토큰을 whitelist에 등록
2. 사용자가 `KUSDC.approve(CafePayment, amount)` 실행
3. 사용자가 `CafePayment.pay(KUSDC, amount)` 실행
4. 결제 금액 중 수수료를 제외한 금액은 merchant에게 전송
5. 수수료는 `CafePayment` 컨트랙트에 누적
6. Owner는 `withdrawFees`로 누적 수수료 인출 가능

## 실행 순서

### 1. MetaMask에 GIWA Sepolia Testnet 추가

- Network Name: GIWA Sepolia Testnet
- Chain ID: `91342`
- Currency Symbol: `ETH`

### 2. Remix에서 KUSDC 배포

1. `KUSDC.sol` 컴파일
2. Injected Provider - MetaMask 선택
3. GIWA Sepolia Testnet 확인
4. `KUSDC` 배포
5. 배포된 KUSDC 주소 기록

```text
KUSDC Contract Address: 0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21

```

### 3. KUSDC mint

내 지갑 주소로 100 KUSDC를 발행합니다.

```text
mint(내_지갑주소, 100000000)
```

### 4. balanceOf 확인

```text
balanceOf(내_지갑주소)
```

예상 결과:

```text
100000000
```

### 5. Remix에서 CafePayment 배포

생성자 입력값:

```text
merchant = 카페_사장님_주소 또는 테스트용_다른_주소
feeRate = 100
```

`feeRate = 100`은 1% 수수료를 의미합니다.

```text
CafePayment Contract Address: 0x15168Ed0B2de2f830f38a6Da544512D3D6426489
```

주의: merchant를 내 지갑 주소와 똑같이 넣으면 결제 후 내 잔액 변화가 수수료만 빠진 것처럼 보여서 결과 확인이 헷갈릴 수 있습니다. 제출용으로는 가능하면 다른 테스트 주소를 merchant로 넣는 것이 더 명확합니다.

### 6. KUSDC whitelist 등록

`CafePayment` 컨트랙트에서 실행합니다.

```text
addWhitelistedToken(KUSDC_컨트랙트_주소)
```

확인:

```text
whitelistedTokens(KUSDC_컨트랙트_주소)
```

예상 결과:

```text
true
```

### 7. KUSDC approve

`KUSDC` 컨트랙트에서 실행합니다.

```text
approve(CafePayment_컨트랙트_주소, 10000000)
```

위 값은 10 KUSDC 결제를 허용하는 값입니다.

### 8. CafePayment pay

`CafePayment` 컨트랙트에서 실행합니다.

```text
pay(KUSDC_컨트랙트_주소, 10000000)
```

예상 결과:

- 결제 총액: 10 KUSDC
- 수수료율: 1%
- merchant 수령액: 9.9 KUSDC
- CafePayment 컨트랙트 수수료 잔액: 0.1 KUSDC

## Nodit 활용

이번 과제의 핵심 조건 중 하나는 Nodit 활용입니다. Remix와 MetaMask에서 트랜잭션을 실행한 뒤, Nodit Node API를 사용해 GIWA Sepolia의 온체인 데이터를 조회했습니다.

### 1. Nodit API Key 준비

Nodit Console에서 API Key를 발급받습니다.

보안을 위해 API Key는 코드에 직접 넣지 않고 환경변수로 설정합니다.

Windows PowerShell:

```powershell
$env:NODIT_API_KEY="여기에_본인_NODIT_API_KEY"
```

macOS / Linux:

```bash
export NODIT_API_KEY="여기에_본인_NODIT_API_KEY"
```

### 2. Nodit 검증 스크립트 실행

아래 값은 본인 값으로 바꿔서 실행합니다.

Windows PowerShell:

```powershell
node .\scripts\nodit-check.js `
  --account 0x571b4283616d1399D513490a43576D257d770DCC `
  --kusdc 0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21 `
  --cafe 0x15168Ed0B2de2f830f38a6Da544512D3D6426489 `
  --payTx 0x8c1cabcd191958e1aee353f352b26ec77d076a053d9baed30518621a828ae908


macOS / Linux:

```bash
node scripts/nodit-check.js \
  --account 0x내_지갑주소 \
  --kusdc 0xKUSDC_컨트랙트주소 \
  --cafe 0xCafePayment_컨트랙트주소 \
  --payTx 0xpay_트랜잭션해시
```

### 3. Nodit로 확인하는 항목

스크립트는 Nodit Node API를 통해 다음을 확인합니다.

- `eth_chainId`: GIWA Sepolia Chain ID가 `91342`인지 확인
- `eth_blockNumber`: 최신 블록 번호 조회
- `eth_getTransactionReceipt`: `pay` 트랜잭션 성공 여부 확인
- `eth_call`: KUSDC `balanceOf` 조회
- `eth_call`: CafePayment `whitelistedTokens` 조회
- `eth_call`: CafePayment `merchant`, `feeRate` 조회
- `eth_call`: CafePayment 컨트랙트에 쌓인 KUSDC 수수료 잔액 조회

### 4. 제출용 Nodit 캡처

아래 결과가 보이는 터미널 화면을 캡처해서 제출 자료에 추가합니다.

```text
eth_chainId: 0x164ce (91342)
✅ GIWA Sepolia 체인 확인
status: 0x1 ✅ 성공
KUSDC whitelisted: true ✅
CafePayment KUSDC fee balance: 0.1 KUSDC
```

추천 캡처 파일명:

```text
08_nodit_chainid_and_receipt.png
09_nodit_contract_state.png
```

## 실행 결과 정리

- KUSDC mint 결과: `100000000`
- decimals: `6`
- 실제 발행량: `100 KUSDC`
- 결제 금액: `10 KUSDC`
- 수수료율: `1%`
- merchant 수령액: `9.9 KUSDC`
- CafePayment 수수료 누적액: `0.1 KUSDC`

## 캡처 자료

작업 완료 캡처는 `screenshots` 폴더에 정리합니다.

추천 캡처 파일명:

- `01_metamask_giwa_network.png`
- `02_kusdc_deploy.png`
- `03_kusdc_balanceof.png`
- `04_cafepayment_deploy.png`
- `05_whitelisted_token_true.png`
- `06_approve_success.png`
- `07_pay_success.png`
- `08_nodit_chainid_and_receipt.png`
- `09_nodit_contract_state.png`

## 제출 설명 예시

GIWA Sepolia Testnet에서 자체 스테이블코인 KUSDC를 배포하고, CafePayment 컨트랙트를 통해 KUSDC 기반 카페 결제 흐름을 구현했습니다. 결제 가능 토큰 whitelist, merchant 수취, 수수료 누적 및 인출 구조를 포함했으며, Remix와 MetaMask로 트랜잭션을 실행했습니다. 이후 Nodit Node API를 활용하여 GIWA Sepolia의 chainId, pay 트랜잭션 receipt, KUSDC balance, whitelist 여부, fee balance를 조회하여 온체인 결과를 검증했습니다.
