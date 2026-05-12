# GIWA Stablecoin Cafe Payment DApp

## 프로젝트 개요

GIWA Sepolia Testnet 위에서 자체 ERC-20 기반 스테이블코인 `KUSDC`를 배포하고, `CafePayment` 컨트랙트와 상호작용하여 스테이블코인 결제를 수행한 실습입니다.

이번 프로젝트는 다음 4가지를 목표로 구현했습니다.

1. GIWA Sepolia Testnet 사용
2. 나만의 스테이블코인 `KUSDC` 배포
3. `CafePayment` 컨트랙트와 상호작용하여 KUSDC 결제 수행
4. Nodit Node API로 배포 및 결제 결과 조회

## 사용 네트워크 및 도구

- Network: GIWA Sepolia Testnet
- Chain ID: `91342`
- Currency Symbol: `ETH`
- Wallet: MetaMask
- Smart Contract IDE: Remix IDE
- Blockchain API: Nodit Node API
- Nodit Node API Endpoint: `https://giwa-sepolia.nodit.io/`

## 배포한 컨트랙트

### `KUSDC.sol`

자체 스테이블코인 역할을 하는 ERC-20 기반 토큰 컨트랙트입니다.

주요 기능:

- ERC-20 토큰 발행
- `decimals = 6`
- Owner 권한 기반 `mint`
- `balanceOf`, `transfer`, `approve`, `transferFrom` 등 ERC-20 기본 기능 지원

### `CafePayment.sol`

KUSDC를 이용해 카페 결제를 수행하는 결제 컨트랙트입니다.

주요 기능:

- 결제 가능 토큰 whitelist 관리
- merchant 주소 관리
- 수수료율 관리
- `approve + pay` 방식 결제
- 수수료 누적
- `withdrawFees`를 통한 수수료 인출

### `IKUSDC.sol`

`KUSDC` 컨트랙트와 상호작용하기 위한 인터페이스입니다.

### `ICafePayment.sol`

`CafePayment` 컨트랙트와 상호작용하기 위한 인터페이스입니다.

## 주요 기능

### 1. KUSDC 발행

`KUSDC`는 USDC와 유사하게 `decimals`를 6으로 설정했습니다.

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

## 실제 배포 정보

### 지갑 주소

```text
Account: 0x571b4283616d1399D513490a43576D257d770DCC
```

### KUSDC 컨트랙트 주소

```text
KUSDC Contract Address: 0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21
```

### CafePayment 컨트랙트 주소

```text
CafePayment Contract Address: 0x15168Ed0B2de2f830f38a6Da544512D3D6426489
```

### Merchant 주소

```text
Merchant Address: 0x3f72accfd3962893ac59de41cf7c860a6eb8873
```

### Pay 트랜잭션 해시

```text
Pay Transaction Hash: 0x8c1cabcd191958e1aee353f352b26ec77d076a053d9baed30518621a828ae908
```

## 실행 순서

### 1. MetaMask에 GIWA Sepolia Testnet 추가

- Network Name: GIWA Sepolia Testnet
- Chain ID: `91342`
- Currency Symbol: `ETH`

### 2. Remix에서 KUSDC 배포

1. `KUSDC.sol` 컴파일
2. `Browser Extension - MetaMask` 선택
3. GIWA Sepolia Testnet 연결 확인
4. `KUSDC` 배포
5. 배포된 KUSDC 주소 기록

```text
KUSDC Contract Address: 0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21
```

### 3. KUSDC mint

내 지갑 주소로 100 KUSDC를 발행했습니다.

```text
mint(0x571b4283616d1399D513490a43576D257d770DCC, 100000000)
```

### 4. balanceOf 확인

```text
balanceOf(0x571b4283616d1399D513490a43576D257d770DCC)
```

mint 직후 예상 결과:

```text
100000000
```

### 5. Remix에서 CafePayment 배포

생성자 입력값:

```text
merchant = 0x3f72accfd3962893ac59de41cf7c860a6eb8873
feeRate = 100
```

`feeRate = 100`은 1% 수수료를 의미합니다.

```text
CafePayment Contract Address: 0x15168Ed0B2de2f830f38a6Da544512D3D6426489
```

### 6. KUSDC whitelist 등록

`CafePayment` 컨트랙트에서 KUSDC를 결제 가능한 토큰으로 등록했습니다.

```text
addWhitelistedToken(0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21)
```

확인:

```text
whitelistedTokens(0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21)
```

결과:

```text
true
```

### 7. KUSDC approve

`KUSDC` 컨트랙트에서 `CafePayment` 컨트랙트가 10 KUSDC를 사용할 수 있도록 승인했습니다.

```text
approve(0x15168Ed0B2de2f830f38a6Da544512D3D6426489, 10000000)
```

### 8. CafePayment pay

`CafePayment` 컨트랙트에서 10 KUSDC 결제를 실행했습니다.

```text
pay(0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21, 10000000)
```

트랜잭션 해시:

```text
0x8c1cabcd191958e1aee353f352b26ec77d076a053d9baed30518621a828ae908
```

결제 결과:

- 결제 총액: 10 KUSDC
- 수수료율: 1%
- merchant 수령액: 9.9 KUSDC
- CafePayment 컨트랙트 수수료 잔액: 0.1 KUSDC
- 결제 후 사용자 잔액: 90 KUSDC

## Nodit 활용

이번 과제의 핵심 조건 중 하나는 Nodit 활용입니다. Remix와 MetaMask에서 트랜잭션을 실행한 뒤, Nodit Node API를 사용해 GIWA Sepolia의 온체인 데이터를 조회했습니다.

### 1. Nodit API Key 준비

Nodit Console에서 API Key를 발급받았습니다.

보안을 위해 API Key는 코드에 직접 넣지 않고 환경변수로 설정했습니다.

Windows PowerShell:

```powershell
$env:NODIT_API_KEY="여기에_본인_NODIT_API_KEY"
```

macOS / Linux:

```bash
export NODIT_API_KEY="여기에_본인_NODIT_API_KEY"
```

> 실제 Nodit API Key는 보안상 README와 GitHub repository에 포함하지 않았습니다.

### 2. Nodit 검증 스크립트 실행

아래 명령어는 실제 배포 주소와 실제 `pay` 트랜잭션 해시를 사용한 실행 예시입니다.

Windows PowerShell:

```powershell
node .\scripts\nodit-check.js `
  --account 0x571b4283616d1399D513490a43576D257d770DCC `
  --kusdc 0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21 `
  --cafe 0x15168Ed0B2de2f830f38a6Da544512D3D6426489 `
  --payTx 0x8c1cabcd191958e1aee353f352b26ec77d076a053d9baed30518621a828ae908
```

macOS / Linux:

```bash
node scripts/nodit-check.js \
  --account 0x571b4283616d1399D513490a43576D257d770DCC \
  --kusdc 0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21 \
  --cafe 0x15168Ed0B2de2f830f38a6Da544512D3D6426489 \
  --payTx 0x8c1cabcd191958e1aee353f352b26ec77d076a053d9baed30518621a828ae908
```

### 3. Nodit로 확인한 항목

스크립트는 Nodit Node API를 통해 다음을 확인했습니다.

- `eth_chainId`: GIWA Sepolia Chain ID가 `91342`인지 확인
- `eth_blockNumber`: 최신 블록 번호 조회
- `eth_getTransactionReceipt`: `pay` 트랜잭션 성공 여부 확인
- `eth_call`: KUSDC `balanceOf` 조회
- `eth_call`: CafePayment `whitelistedTokens` 조회
- `eth_call`: CafePayment `merchant`, `feeRate` 조회
- `eth_call`: CafePayment 컨트랙트에 쌓인 KUSDC 수수료 잔액 조회

### 4. Nodit 검증 결과

터미널에서 다음 결과를 확인했습니다.

```text
eth_chainId: 0x164ce (91342)
✅ GIWA Sepolia 체인 확인

pay transaction receipt
status: 0x1 ✅ 성공

KUSDC balanceOf(account) by Nodit eth_call
raw balance: 90000000
formatted balance: 90 KUSDC

CafePayment contract state by Nodit eth_call
KUSDC whitelisted: true ✅
merchant: 0x3f72accfd3962893ac59de41cf7c860a6eb8873
feeRate: 100 basis points
CafePayment KUSDC fee balance: 0.1 KUSDC
```

## 실행 결과 정리

- KUSDC mint 결과: `100000000`
- decimals: `6`
- 실제 발행량: `100 KUSDC`
- 결제 금액: `10 KUSDC`
- 수수료율: `1%`
- merchant 수령액: `9.9 KUSDC`
- CafePayment 수수료 누적액: `0.1 KUSDC`
- 결제 후 사용자 잔액: `90 KUSDC`
- Pay Transaction Hash: `0x8c1cabcd191958e1aee353f352b26ec77d076a053d9baed30518621a828ae908`

## 캡처 자료

작업 완료 캡처는 `screenshots` 폴더에 정리했습니다.

캡처 파일명:

- `01_metamask_giwa_network.png`
- `02_kusdc_deploy.png`
- `03_kusdc_balanceof.png`
- `04_cafepayment_deploy.png`
- `05_whitelisted_token_true.png`
- `06_approve_success.png`
- `07_pay_success.png`
- `08_nodit_chainid_and_receipt.png`
- `09_nodit_contract_state.png`


## 제출 설명

GIWA Sepolia Testnet에서 자체 스테이블코인 KUSDC를 배포하고, CafePayment 컨트랙트를 통해 KUSDC 기반 카페 결제 흐름을 구현했습니다. 결제 가능 토큰 whitelist, merchant 수취, 수수료 누적 및 인출 구조를 포함했으며, Remix와 MetaMask로 트랜잭션을 실행했습니다. 이후 Nodit Node API를 활용하여 GIWA Sepolia의 chainId, pay 트랜잭션 receipt, KUSDC balance, whitelist 여부, merchant 주소, feeRate, fee balance를 조회하여 온체인 결과를 검증했습니다.