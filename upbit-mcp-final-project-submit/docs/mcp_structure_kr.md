# MCP 구조 설명

## MCP Server

`servers/upbit_server.py`는 MCP Server 역할을 한다. 이 파일은 Upbit Public API를 직접 호출하고, 조회 기능을 MCP tool로 제공한다.

핵심 예시는 다음과 같다.

```python
@mcp.tool()
async def get_ticker(market: str = "KRW-BTC") -> str:
    ...
```

이처럼 함수에 `@mcp.tool()`을 붙이면 MCP 클라이언트가 호출할 수 있는 tool이 된다.

## MCP Client

`clients/test_upbit_client.py`는 MCP Client 역할을 한다. 클라이언트는 서버 파일을 stdio 방식으로 실행하고, MCP 세션을 초기화한 뒤 다음 순서로 동작한다.

```text
1. session.initialize()
2. session.list_tools()
3. session.call_tool(tool_name, arguments)
```

즉, 클라이언트는 서버가 가진 tool 목록을 먼저 확인하고, 필요한 tool을 호출한다.

## Web UI

`web_app.py`는 브라우저 UI와 MCP 서버 사이의 중간 백엔드 역할을 한다. Web UI가 직접 Upbit API를 호출하는 것이 아니라, `web_app.py`가 MCP ClientSession을 열고 MCP 서버 tool을 호출한다.

```text
Browser UI → web_app.py → MCP ClientSession → Upbit MCP Server → Upbit API
```

따라서 UI 역시 MCP 구조를 유지한다.
