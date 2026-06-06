# 시연 순서

## 1. CLI 시연

```bash
python clients/test_upbit_client.py
```

확인할 부분:

1. `[1/3] MCP 세션 초기화`
2. `[2/3] Tool discovery: list_tools()`
3. `[3/3] Tool call 실행: call_tool()`
4. `get_ticker`, `get_orderbook`, `get_recent_trades` 결과 출력

## 2. Web UI 시연

```bash
python web_app.py
```

브라우저에서 `http://127.0.0.1:8765` 접속 후 다음 버튼을 누른다.

1. Tool 목록 확인
2. 현재가 조회
3. 호가창 조회
4. 최근 체결 조회
5. 마켓 요약
6. 코인 비교
7. 분봉 캔들

## 3. 설명 멘트 예시

본 프로젝트는 Upbit API를 직접 호출하는 단순 프로그램이 아니라 MCP 서버와 MCP 클라이언트를 분리한 구조입니다. 서버는 Upbit 데이터를 가져오는 기능을 tool로 제공하고, 클라이언트는 `list_tools()`로 tool 목록을 발견한 뒤 `call_tool()`로 필요한 데이터를 요청합니다. Web UI 역시 같은 MCP 흐름을 사용합니다.
