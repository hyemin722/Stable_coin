from __future__ import annotations

import asyncio
import contextlib
import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parent
SERVER_PATH = ROOT / "servers" / "upbit_server.py"
WEB_INDEX = ROOT / "web" / "index.html"

HOST = "127.0.0.1"
PORT = int(os.environ.get("UPBIT_MCP_UI_PORT", "8765"))


@contextlib.contextmanager
def hidden_server_logs():
    """UI에서는 MCP 내부 stderr 로그를 숨겨 결과만 깔끔하게 보여준다."""
    with open(os.devnull, "w", encoding="utf-8") as sink:
        yield sink


def extract_text(result: Any) -> str:
    """MCP call_tool 결과에서 텍스트 본문만 추출한다."""
    parts: list[str] = []
    for item in result.content:
        text = getattr(item, "text", None)
        parts.append(text if text is not None else str(item))
    return "\n".join(parts).strip()


async def list_mcp_tools() -> dict[str, Any]:
    params = StdioServerParameters(
        command=sys.executable,
        args=[str(SERVER_PATH)],
        cwd=ROOT,
        env=None,
    )

    with hidden_server_logs() as errlog:
        async with stdio_client(params, errlog=errlog) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = await session.list_tools()
                return {
                    "ok": True,
                    "server": "upbit-mcp-server",
                    "transport": "stdio",
                    "tools": [
                        {
                            "name": tool.name,
                            "description": tool.description or "",
                        }
                        for tool in tools.tools
                    ],
                }


async def call_mcp_tool(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    params = StdioServerParameters(
        command=sys.executable,
        args=[str(SERVER_PATH)],
        cwd=ROOT,
        env=None,
    )

    with hidden_server_logs() as errlog:
        async with stdio_client(params, errlog=errlog) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = await session.list_tools()
                result = await session.call_tool(tool_name, arguments)
                is_error = bool(getattr(result, "isError", False) or getattr(result, "is_error", False))

                return {
                    "ok": not is_error,
                    "server": "upbit-mcp-server",
                    "transport": "stdio",
                    "client_step": "list_tools() 후 call_tool() 실행",
                    "tool": tool_name,
                    "arguments": arguments,
                    "discovered_tools": [tool.name for tool in tools.tools],
                    "result": extract_text(result),
                }


def normalize_market(raw: str | None) -> str:
    text = (raw or "KRW-BTC").strip().upper()
    if not text:
        return "KRW-BTC"
    if "-" not in text:
        return f"KRW-{text}"
    return text


def int_param(value: str | None, default: int, minimum: int, maximum: int) -> int:
    try:
        number = int(value or default)
    except (TypeError, ValueError):
        number = default
    return max(minimum, min(number, maximum))


class UpbitMcpUIHandler(BaseHTTPRequestHandler):
    server_version = "UpbitMcpUI/1.0"

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        # 터미널 로그를 간단히 유지한다.
        print(f"[UI] {self.address_string()} - {format % args}")

    def send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path: Path, content_type: str) -> None:
        if not path.exists():
            self.send_error(404, "file not found")
            return
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        try:
            if path in ("/", "/index.html"):
                self.send_file(WEB_INDEX, "text/html; charset=utf-8")
                return

            if path == "/api/tools":
                payload = asyncio.run(list_mcp_tools())
                self.send_json(payload)
                return

            if path in ("/api/market-list", "/api/markets"):
                quote = query.get("quote_currency", ["KRW"])[0]
                limit = int_param(query.get("limit", ["20"])[0], 20, 1, 100)
                payload = asyncio.run(call_mcp_tool("get_market_list", {"quote_currency": quote, "limit": limit}))
                self.send_json(payload)
                return

            if path == "/api/ticker":
                market = normalize_market(query.get("market", ["KRW-BTC"])[0])
                payload = asyncio.run(call_mcp_tool("get_ticker", {"market": market}))
                self.send_json(payload)
                return

            if path == "/api/orderbook":
                market = normalize_market(query.get("market", ["KRW-BTC"])[0])
                count = int_param(query.get("count", ["10"])[0], 10, 1, 30)
                payload = asyncio.run(call_mcp_tool("get_orderbook", {"market": market, "count": count}))
                self.send_json(payload)
                return

            if path == "/api/trades":
                market = normalize_market(query.get("market", ["KRW-BTC"])[0])
                count = int_param(query.get("count", ["10"])[0], 10, 1, 50)
                payload = asyncio.run(call_mcp_tool("get_recent_trades", {"market": market, "count": count}))
                self.send_json(payload)
                return

            if path == "/api/summary":
                market = normalize_market(query.get("market", ["KRW-BTC"])[0])
                payload = asyncio.run(call_mcp_tool("get_market_summary", {"market": market}))
                self.send_json(payload)
                return

            if path == "/api/compare":
                markets = query.get("markets", ["KRW-BTC,KRW-ETH,KRW-XRP"])[0]
                payload = asyncio.run(call_mcp_tool("compare_markets", {"markets": markets}))
                self.send_json(payload)
                return

            if path == "/api/candles":
                market = normalize_market(query.get("market", ["KRW-BTC"])[0])
                unit = int_param(query.get("unit", ["60"])[0], 60, 1, 240)
                count = int_param(query.get("count", ["5"])[0], 5, 1, 20)
                payload = asyncio.run(call_mcp_tool("get_minute_candles", {"market": market, "unit": unit, "count": count}))
                self.send_json(payload)
                return

            self.send_error(404, "not found")

        except Exception as exc:  # 실제 제출/시연 때 오류를 화면에서 바로 확인하기 위함
            self.send_json(
                {
                    "ok": False,
                    "error": str(exc),
                    "traceback": traceback.format_exc(),
                },
                status=500,
            )


def main() -> None:
    if not SERVER_PATH.exists():
        raise FileNotFoundError(f"MCP server file not found: {SERVER_PATH}")
    if not WEB_INDEX.exists():
        raise FileNotFoundError(f"Web UI file not found: {WEB_INDEX}")

    httpd = ThreadingHTTPServer((HOST, PORT), UpbitMcpUIHandler)
    print("=" * 72)
    print("Upbit MCP Web UI 실행")
    print(f"주소: http://{HOST}:{PORT}")
    print("흐름: Browser UI -> Web Backend(MCP Client) -> MCP Server -> Upbit API")
    print("종료: Ctrl + C")
    print("=" * 72)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nUI 서버를 종료합니다.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
