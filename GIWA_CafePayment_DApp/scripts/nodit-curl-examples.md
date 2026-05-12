# Nodit cURL 캡처용 예시

아래 명령어의 `YOUR_NODIT_API_KEY`, `YOUR_PAY_TX_HASH`를 본인 값으로 바꿔서 실행합니다.

## 1. GIWA Sepolia Chain ID 확인

```bash
curl -X POST 'https://giwa-sepolia.nodit.io/' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'X-API-KEY: YOUR_NODIT_API_KEY' \
  -d '{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "eth_chainId",
    "params": []
  }'
```

예상 결과의 `result`는 GIWA Sepolia Chain ID 91342의 16진수 값입니다.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x164ce"
}
```

## 2. pay 트랜잭션 receipt 확인

```bash
curl -X POST 'https://giwa-sepolia.nodit.io/' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'X-API-KEY: YOUR_NODIT_API_KEY' \
  -d '{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "eth_getTransactionReceipt",
    "params": ["YOUR_PAY_TX_HASH"]
  }'
```

`status`가 `0x1`이면 트랜잭션 성공입니다.
