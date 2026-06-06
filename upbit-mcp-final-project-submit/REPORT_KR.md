# Upbit MCP 데이터 조회 프로그램 구현 보고서

## 1. 프로젝트명

Upbit MCP Data Viewer

## 2. 구현 목적

본 프로젝트는 Upbit Public API에서 코인 현재가, 호가창/주문장, 최근 체결 내역, 마켓 정보 등을 조회할 수 있는 MCP 기반 프로그램을 구현하는 것을 목표로 한다.

## 3. 전체 구조

```text
CLI Client 또는 Browser UI
        ↓
MCP ClientSession
        ↓ list_tools(), call_tool()
Upbit MCP Server
        ↓
Upbit Public API
        ↓
조회 결과 반환
```

본 구현은 MCP 서버와 MCP 클라이언트를 분리하였다. 서버는 Upbit 데이터 조회 기능을 MCP tool로 제공하고, 클라이언트는 MCP 프로토콜을 통해 tool 목록을 확인하고 필요한 tool을 호출한다.

## 4. MCP 서버 구현

파일명: `servers/upbit_server.py`

MCP 서버는 `FastMCP`를 이용하여 구현하였다. 각 기능은 `@mcp.tool()`로 등록되어 MCP 클라이언트에서 호출할 수 있다.

| Tool | 기능 |
|---|---|
| `get_market_list` | 업비트 마켓 목록 조회 |
| `get_ticker` | 현재가 조회 |
| `get_orderbook` | 호가창/주문장 조회 |
| `get_recent_trades` | 최근 체결 내역 조회 |
| `get_market_summary` | 현재가와 최우선 호가 기반 요약 정보 조회 |
| `compare_markets` | 여러 코인의 현재가, 등락률, 거래대금 비교 |
| `get_minute_candles` | 분봉 캔들 데이터 조회 |

## 5. MCP 클라이언트 구현

파일명: `clients/test_upbit_client.py`

클라이언트는 MCP 서버를 stdio 방식으로 실행하고, `ClientSession`을 통해 서버와 통신한다.

동작 순서는 다음과 같다.

1. `StdioServerParameters`로 MCP 서버 실행 정보 설정
2. `stdio_client()`로 서버와 stdio 연결
3. `ClientSession` 생성
4. `session.initialize()`로 MCP 세션 초기화
5. `session.list_tools()`로 서버 tool 목록 확인
6. `session.call_tool()`로 Upbit 데이터 조회 tool 호출
7. MCP 서버가 반환한 결과 출력

## 6. Web UI 구현

파일명: `web_app.py`, `web/index.html`

Web UI는 브라우저에서 MCP tool 호출 결과를 확인할 수 있도록 구현하였다. 브라우저가 직접 Upbit API를 호출하는 방식이 아니라, `web_app.py` 백엔드가 MCP ClientSession을 생성하고 MCP 서버의 tool을 호출한다.

```text
Browser UI
  → web_app.py
  → MCP ClientSession
  → Upbit MCP Server
  → Upbit Public API
```

## 7. 사용한 Upbit Public API

| 기능 | Endpoint |
|---|---|
| 마켓 목록 | `/v1/market/all` |
| 현재가 | `/v1/ticker` |
| 호가창/주문장 | `/v1/orderbook` |
| 최근 체결 | `/v1/trades/ticks` |
| 분봉 캔들 | `/v1/candles/minutes/{unit}` |

본 프로젝트는 시세 조회용 Public API만 사용하므로 별도의 API Key가 필요하지 않다.

## 8. 실행 방법

### CLI

```bash
python clients/test_upbit_client.py
```

### Web UI

```bash
python web_app.py
```

브라우저 접속 주소:

```text
http://127.0.0.1:8765
```

## 9. 기대 실행 결과

CLI와 Web UI에서 다음 내용을 확인할 수 있다.

- MCP 서버와 클라이언트 연결
- `list_tools()`를 통한 tool 목록 확인
- `call_tool()`을 통한 현재가 조회
- `call_tool()`을 통한 호가창/주문장 조회
- 최근 체결, 마켓 요약, 코인 비교, 분봉 캔들 데이터 조회

## 10. 결론

본 프로젝트는 Upbit 데이터를 조회하는 기능을 MCP 서버의 tool로 제공하고, MCP 클라이언트가 해당 tool을 발견하고 호출하는 구조로 구현하였다. CLI 실행과 Web UI 실행을 모두 지원하여 MCP 기반 데이터 조회 흐름을 명확하게 확인할 수 있다.
