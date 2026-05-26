# AI-Assisted KUSDC PayGuard

KUSDC로 카페 메뉴를 결제하고, 결제 후 생성된 Tx Hash를 Nodit RPC로 검증한 뒤 고객에게는 블록체인 영수증을, 관리자에게는 정산 대시보드를 제공하는 DApp 프로젝트입니다.

## 주요 기능

- 고객 결제 화면: `/customer`
- 관리자 정산 화면: `/admin`
- MetaMask 지갑 연결
- GIWA Sepolia Testnet 연동
- KUSDC 잔액 및 allowance 조회
- `approve` 후 `CafePayment.pay` 실제 결제 실행
- Tx Hash 및 Block Number 표시
- Nodit RPC 기반 거래 검증
- PayGuard Risk Score
- AI-style 결제/정산 요약
- QR 영수증

## 사용 네트워크 및 컨트랙트

- Network: GIWA Sepolia Testnet
- Chain ID: `91342`
- RPC: `https://giwa-sepolia.nodit.io/`
- KUSDC Contract: `0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21`
- CafePayment Contract: `0x15168Ed0B2de2f830f38a6Da544512D3D6426489`

## 실행 방법

Node.js 18 이상을 권장합니다.

```bash
npm install
```

`.env.example`을 복사해서 `.env` 파일을 만든 뒤 Nodit API Key를 입력합니다.

```env
PORT=5173
NODIT_RPC_URL=https://giwa-sepolia.nodit.io/
NODIT_API_KEY=YOUR_NODIT_API_KEY
```

Windows에서는 아래 파일을 더블클릭합니다.

```text
start-windows.bat
```

또는 터미널에서 실행합니다.

```bash
node server.js
```

브라우저에서 접속합니다.

```text
http://localhost:5173/
```

## 화면 URL

| URL | 역할 |
|---|---|
| `http://localhost:5173/` | 서비스 포털 |
| `http://localhost:5173/customer` | 고객 결제 화면 |
| `http://localhost:5173/admin` | 관리자 정산 화면 |

## 시연 흐름

1. `/customer`에서 메뉴 선택
2. MetaMask 연결 및 온체인 상태 새로고침
3. `approve` 실행
4. `pay` 결제 실행
5. SUCCESS 영수증, Tx Hash, Block Number 확인
6. Nodit 검증 및 PayGuard Risk Score 확인
7. `/admin`에서 매출, 수수료, 정산 예정 금액 확인

## 폴더 구성

```text
.
├── public/          # 프론트엔드 파일
├── presentation/    # 프로젝트 PPT
├── server.js        # Node.js 서버 및 Nodit 프록시
├── package.json
├── .env.example
├── .gitignore
└── start-windows.bat
```
