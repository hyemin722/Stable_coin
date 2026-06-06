from __future__ import annotations

import argparse
import asyncio
import contextlib
import os
import sys
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[1]
SERVER_PATH = ROOT / "servers" / "upbit_server.py"

DEFAULT_CALLS = [
    ("get_market_list", {"quote_currency": "KRW", "limit": 8}),
    ("get_ticker", {"market": "KRW-BTC"}),
    ("get_orderbook", {"market": "KRW-BTC", "count": 5}),
    ("get_recent_trades", {"market": "KRW-BTC", "count": 5}),
    ("get_market_summary", {"market": "KRW-ETH"}),
    ("compare_markets", {"markets": "KRW-BTC,KRW-ETH,KRW-XRP"}),
    ("get_minute_candles", {"market": "KRW-BTC", "unit": 60, "count": 5}),
]


def extract_text(result: Any) -> str:
    """MCP call_tool 결과에서 text만 보기 좋게 추출한다."""
    parts: list[str] = []
    for item in result.content:
        text = getattr(item, "text", None)
        parts.append(text if text is not None else str(item))
    return "\n".join(parts).strip()


def line(title: str = "") -> str:
    width = 74
    if not title:
        return "─" * width
    label = f" {title} "
    return label + "─" * max(0, width - len(label))


def print_tool_card(index: int, name: str, description: str | None) -> None:
    print(f" {index}. {name}")
    if description:
        print(f"    └─ {description}")


def print_result(text: str, *, error: bool = False) -> None:
    prefix = "❌" if error else "✅"
    print(f"{prefix} MCP Server 응답")
    print(line())
    print(text or "응답 본문이 비어 있습니다.")
    print(line())


@contextlib.contextmanager
def server_errlog(verbose: bool):
    """기본 실행에서는 MCP 내부 로그를 숨겨서 결과가 깔끔하게 보이게 한다."""
    if verbose:
        yield sys.stderr
        return

    with open(os.devnull, "w", encoding="utf-8") as sink:
        yield sink


async def run_demo(verbose: bool = False) -> None:
    params = StdioServerParameters(
        command=sys.executable,
        args=[str(SERVER_PATH)],
        cwd=ROOT,
        env=None,
    )

    print(line("UPBIT MCP FINAL PROJECT"))
    print(f"Project : {ROOT}")
    print(f"Server  : {SERVER_PATH.relative_to(ROOT)}")
    print("Transport: stdio")

    with server_errlog(verbose) as errlog:
        async with stdio_client(params, errlog=errlog) as (read, write):
            async with ClientSession(read, write) as session:
                print("\n[1/3] MCP 세션 초기화")
                await session.initialize()
                print("✅ client ↔ server 연결 완료")

                print("\n[2/3] Tool discovery: list_tools()")
                tools = await session.list_tools()
                for i, tool in enumerate(tools.tools, 1):
                    print_tool_card(i, tool.name, tool.description)

                print("\n[3/3] Tool call 실행: call_tool()")
                for tool_name, arguments in DEFAULT_CALLS:
                    print(f"\n▶ 호출: {tool_name}({arguments})")
                    result = await session.call_tool(tool_name, arguments)
                    is_error = bool(getattr(result, "isError", False) or getattr(result, "is_error", False))
                    print_result(extract_text(result), error=is_error)

    print("\n데모 완료: MCP client가 server의 tool을 발견하고 호출하는 흐름을 확인했습니다.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upbit 데이터를 조회하는 MCP stdio client demo",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="MCP/HTTP 내부 로그를 함께 표시합니다. 오류 해결 시에만 사용하세요.",
    )
    args = parser.parse_args()
    asyncio.run(run_demo(verbose=args.verbose))


if __name__ == "__main__":
    main()
