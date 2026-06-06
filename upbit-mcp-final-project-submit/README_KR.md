# Upbit MCP 데이터 조회 프로그램

## 1. 프로젝트 개요

본 프로젝트는 Upbit Public API를 이용하여 코인 현재가, 호가창/주문장, 최근 체결, 마켓 목록, 마켓 요약, 코인 비교, 분봉 캔들 데이터를 조회하는 MCP 기반 프로그램이다.

MCP 서버는 Upbit API를 호출하는 기능을 tool로 제공하고, MCP 클라이언트는 서버에 연결하여 `list_tools()`로 tool 목록을 확인한 뒤 `call_tool()`로 필요한 데이터를 요청한다.

## 2. 시스템 구조

```text
CLI Client / Web Browser
        ↓
MCP Client Layer
        ↓ list_tools(), call_tool()
Upbit MCP Server
        ↓ Upbit Public API 호출
Upbit Public API
        ↓ JSON 응답
Upbit MCP Server
        ↓ MCP tool result
CLI 출력 / Web UI 출력
```

이 구조를 통해 단순 REST API 호출 코드가 아니라, MCP 서버와 MCP 클라이언트가 분리된 데이터 조회 프로그램으로 구현하였다.

## 3. 주요 파일

| 경로 | 설명 |
|---|---|
| `servers/upbit_server.py` | Upbit API를 MCP tool로 제공하는 서버 |
| `clients/test_upbit_client.py` | MCP 서버에 연결하여 tool을 호출하는 CLI 클라이언트 |
| `web_app.py` | Web UI와 MCP 클라이언트를 연결하는 로컬 백엔드 |
| `web/index.html` | 브라우저 기반 UI |
| `REPORT_KR.md` | 프로젝트 구현 설명 자료 |
| `docs/` | 구조, API 매핑, UI 실행 설명 문서 |

## 4. 제공 MCP Tools

| Tool | 기능 |
|---|---|
| `get_market_list` | 업비트 거래 가능 마켓 목록 조회 |
| `get_ticker` | 특정 코인의 현재가 조회 |
| `get_orderbook` | 호가창/주문장 데이터 조회 |
| `get_recent_trades` | 최근 체결 내역 조회 |
| `get_market_summary` | 현재가, 최우선 매도호가, 최우선 매수호가, 스프레드 요약 |
| `compare_markets` | 여러 코인의 가격, 등락률, 거래대금 비교 |
| `get_minute_candles` | 분봉 캔들 데이터 조회 |

## 5. 실행 방법

### 5.1 패키지 설치

```bash
py -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

### 5.2 CLI 실행

```bash
python clients/test_upbit_client.py
```

CLI 실행 시 MCP 세션 초기화, `list_tools()`를 통한 tool 목록 확인, `call_tool()`을 통한 Upbit 데이터 조회 결과가 출력된다.

### 5.3 Web UI 실행

```bash
python web_app.py
```

브라우저에서 아래 주소로 접속한다.

```text
http://127.0.0.1:8765
```

Web UI에서는 tool 목록 확인, 현재가 조회, 호가창 조회, 최근 체결 조회, 마켓 요약, 코인 비교, 분봉 캔들 조회를 버튼으로 실행할 수 있다.

## 6. 구현 요약

본 프로젝트는 MCP 서버가 Upbit Public API를 호출하고, MCP 클라이언트가 서버 tool을 발견 및 호출하는 구조로 구현되었다. CLI와 Web UI 모두 같은 MCP 기반 흐름을 사용하므로, Upbit 데이터 조회 기능과 MCP 서버-클라이언트 구조를 함께 확인할 수 있다.
