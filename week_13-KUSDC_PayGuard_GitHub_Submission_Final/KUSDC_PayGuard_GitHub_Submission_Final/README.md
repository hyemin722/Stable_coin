# AI-Assisted KUSDC PayGuard

> KUSDC로 카페 메뉴를 결제하고, 결제 후 생성된 Tx Hash를 Nodit RPC로 검증한 뒤, 고객에게는 블록체인 영수증을, 관리자에게는 정산 대시보드와 요약 리포트를 제공하는 DApp 프로젝트입니다.

## 1. 프로젝트 개요

기존 KUSDC 결제 DApp은 결제 트랜잭션 실행에 초점이 있었습니다.  
본 프로젝트는 결제 이후의 흐름까지 확장하여 다음 기능을 제공합니다.

- 고객용 결제 화면: `/customer`
- 관리자용 정산 화면: `/admin`
- MetaMask 지갑 연결
- GIWA Sepolia Testnet 연동
- KUSDC 잔액 및 allowance 조회
- `approve` 후 `CafePayment.pay` 실제 결제 실행
- 결제 후 Tx Hash 표시
- Nodit RPC 기반 `eth_getTransactionReceipt` 검증
- PayGuard Risk Score
- AI-style 결제/정산 요약 리포트
- QR 영수증

## 2. 핵심 차별점

1. **실제 온체인 결제 연동**  
   MetaMask와 GIWA Sepolia Testnet을 연결하여 KUSDC approve/pay 트랜잭션을 실행합니다.

2. **Tx Hash 기반 검증**  
   결제 후 생성된 Tx Hash를 Nodit RPC로 다시 조회하여 실제 블록체인 상에서 성공한 거래인지 확인합니다.

3. **고객/관리자 화면 분리**  
   실제 서비스처럼 고객 결제 화면과 관리자 정산 화면을 URL로 분리했습니다.

4. **결제 이후 서비스화**  
   단순 결제에서 끝나지 않고 영수증, 리스크 확인, 관리자 정산, 요약 리포트까지 제공합니다.

## 3. 사용 네트워크 및 컨트랙트

- Network: GIWA Sepolia Testnet
- Chain ID: `91342`
- RPC: `https://giwa-sepolia.nodit.io/`
- KUSDC Contract: `0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21`
- CafePayment Contract: `0x15168Ed0B2de2f830f38a6Da544512D3D6426489`

## 4. 실행 방법

### 4-1. Node.js 확인

Node.js 18 이상을 권장합니다.

```bash
node -v
```

### 4-2. 환경변수 설정

`.env.example`을 복사해서 `.env` 파일을 만들고 Nodit API Key를 입력합니다.

Windows PowerShell:

```powershell
copy .env.example .env
notepad .env
```

`.env` 예시:

```env
PORT=5173
NODIT_RPC_URL=https://giwa-sepolia.nodit.io/
NODIT_API_KEY=본인_NODIT_API_KEY
```

> `.env` 파일은 개인 API Key가 들어가므로 GitHub에 업로드하지 않습니다.

### 4-3. 실행

Windows에서는 아래 파일을 더블클릭합니다.

```text
start-windows.bat
```

또는 터미널에서 직접 실행합니다.

```bash
node server.js
```

브라우저에서 접속합니다.

```text
http://localhost:5173/
```

## 5. 주요 URL

| URL | 역할 |
|---|---|
| `http://localhost:5173/` | 서비스 포털 |
| `http://localhost:5173/customer` | 고객 결제 화면 |
| `http://localhost:5173/admin` | 관리자 정산 화면 |

## 6. 시연 순서

1. `http://localhost:5173/customer` 접속
2. 메뉴 선택
3. MetaMask 연결
4. 온체인 상태 새로고침
5. `1단계: approve` 실행
6. MetaMask에서 KUSDC 지출 한도 승인
7. `2단계: pay 결제` 실행
8. MetaMask에서 Pay 트랜잭션 승인
9. SUCCESS 영수증, Tx Hash, Block Number 확인
10. Nodit 검증 결과 확인
11. PayGuard Risk Score / AI 영수증 / QR 영수증 확인
12. `http://localhost:5173/admin` 이동
13. 총 매출, 수수료, 정산 예정 금액, 최근 거래 목록, AI 정산 리포트 확인

## 7. 발표 핵심 문장

> 이 프로젝트는 KUSDC로 카페 결제를 하고, 결제 후 생성된 Tx Hash를 Nodit API로 검증해서 실제 블록체인에서 성공한 거래인지 확인하는 서비스입니다.

> 손님은 결제와 영수증을 확인하고, 사장님은 관리자 화면에서 매출, 수수료, 정산 예정 금액을 확인할 수 있습니다.

> approve는 결제 허락이고, pay는 실제 결제입니다.

> 기존 DApp이 결제 실행에서 끝난다면, PayGuard는 결제 이후 검증과 정산까지 확장한 점이 차별점입니다.

## 8. 폴더 구성

```text
.
├── public/                         # 프론트엔드 파일
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── tools/                          # Nodit CLI 확인 도구
│   └── nodit-check.js
├── presentation/                   # 제출용 발표 PPT
├── docs/                           # 발표 대본, 업로드 가이드, 체크리스트
├── screenshots/                    # 캡처 이미지 추가용 폴더
├── server.js                       # Node.js 서버 및 Nodit 프록시
├── package.json
├── .env.example
├── .gitignore
└── start-windows.bat
```

## 9. 보안 주의

- `.env` 파일은 절대 GitHub에 업로드하지 않습니다.
- Nodit API Key는 `.env.example`이 아니라 개인 `.env`에만 입력합니다.
- GitHub에는 `.env.example`만 올립니다.

## 10. 제출 자료

- 실제 연동 웹사이트 코드
- 프로젝트 제안/발표 PPT
- 발표 시연 순서 및 핵심 대본
- GitHub 업로드 가이드
