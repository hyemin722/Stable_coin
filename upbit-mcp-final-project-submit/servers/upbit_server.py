from __future__ import annotations

from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("upbit-mcp-server")

UPBIT_BASE_URL = "https://api.upbit.com/v1"


class UpbitApiError(RuntimeError):
    """업비트 API 호출 실패를 MCP 응답으로 보기 좋게 전달하기 위한 예외."""


def normalize_market(market: str) -> str:
    """BTC 또는 btc처럼 입력해도 KRW-BTC 형식으로 바꿔준다."""
    text = market.strip().upper()
    if not text:
        return "KRW-BTC"
    if "-" not in text:
        return f"KRW-{text}"
    return text


def normalize_markets(markets: str) -> list[str]:
    """BTC,ETH 또는 KRW-BTC,KRW-ETH 입력을 업비트 market list로 정리한다."""
    items = [item.strip() for item in markets.replace("/", ",").split(",") if item.strip()]
    if not items:
        items = ["KRW-BTC", "KRW-ETH"]
    return [normalize_market(item) for item in items[:10]]


async def get_json(path: str, params: dict[str, Any] | None = None) -> Any:
    """Upbit Public API를 호출하고 JSON 결과를 반환한다."""
    url = f"{UPBIT_BASE_URL}{path}"
    headers = {"Accept": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
            response = await client.get(url, params=params or {})
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise UpbitApiError(
            f"Upbit API HTTP 오류: {exc.response.status_code} / 요청={url} / params={params}"
        ) from exc
    except httpx.RequestError as exc:
        raise UpbitApiError(f"Upbit API 연결 오류: {exc}") from exc


def format_krw(value: Any) -> str:
    """가격 출력용 함수"""
    try:
        return f"{float(value):,.0f}원"
    except (TypeError, ValueError):
        return str(value)


def format_float(value: Any, digits: int = 4) -> str:
    try:
        return f"{float(value):,.{digits}f}"
    except (TypeError, ValueError):
        return str(value)


def format_percent(value: Any) -> str:
    try:
        return f"{float(value) * 100:.2f}%"
    except (TypeError, ValueError):
        return str(value)


@mcp.tool()
async def get_market_list(quote_currency: str = "KRW", limit: int = 30) -> str:
    """
    업비트에서 거래 가능한 마켓 목록을 조회합니다.
    quote_currency 예: KRW, BTC, USDT, ALL
    """
    limit = max(1, min(int(limit), 100))
    quote_currency = quote_currency.strip().upper()

    data = await get_json("/market/all", {"is_details": "true"})

    if quote_currency != "ALL":
        data = [item for item in data if item.get("market", "").startswith(f"{quote_currency}-")]

    if not data:
        return f"{quote_currency} 마켓 목록을 찾지 못했습니다. 예: KRW, BTC, USDT, ALL"

    lines = [f"업비트 {quote_currency} 마켓 목록 - 최대 {limit}개"]
    for i, item in enumerate(data[:limit], 1):
        market = item.get("market", "")
        korean_name = item.get("korean_name", "")
        english_name = item.get("english_name", "")
        warning = item.get("market_warning", "NONE")
        lines.append(f"{i}. {market} | {korean_name} / {english_name} | warning={warning}")

    return "\n".join(lines)


@mcp.tool()
async def get_ticker(market: str = "KRW-BTC") -> str:
    """
    업비트 현재가 정보를 조회합니다.
    market 예: KRW-BTC, BTC, KRW-ETH, ETH
    """
    market = normalize_market(market)
    data = await get_json("/ticker", {"markets": market})

    if not data:
        return f"현재가 데이터를 찾지 못했습니다: {market}"

    item = data[0]
    change_rate = float(item.get("signed_change_rate", 0)) * 100
    change_price = item.get("signed_change_price", 0)

    return (
        f"업비트 현재가 조회 결과\n"
        f"마켓: {item.get('market')}\n"
        f"현재가: {format_krw(item.get('trade_price'))}\n"
        f"전일 대비: {change_rate:.2f}% ({format_krw(change_price)})\n"
        f"시가: {format_krw(item.get('opening_price'))}\n"
        f"고가: {format_krw(item.get('high_price'))}\n"
        f"저가: {format_krw(item.get('low_price'))}\n"
        f"24시간 누적 거래대금: {format_krw(item.get('acc_trade_price_24h'))}\n"
        f"최근 거래 시각(KST): {item.get('trade_date_kst')} {item.get('trade_time_kst')}"
    )


@mcp.tool()
async def get_orderbook(market: str = "KRW-BTC", count: int = 10) -> str:
    """
    업비트 호가창/주문장 데이터를 조회합니다.
    count는 1~30 사이로 제한합니다.
    """
    market = normalize_market(market)
    count = max(1, min(int(count), 30))

    data = await get_json("/orderbook", {"markets": market, "count": count})

    if not data:
        return f"호가창 데이터를 찾지 못했습니다: {market}"

    item = data[0]
    units = item.get("orderbook_units", [])[:count]

    lines = [
        f"업비트 호가창 조회 결과",
        f"마켓: {item.get('market')}",
        f"총 매도 잔량: {format_float(item.get('total_ask_size'), 6)}",
        f"총 매수 잔량: {format_float(item.get('total_bid_size'), 6)}",
        "",
        "순번 | 매도호가(ask) | 매도잔량 | 매수호가(bid) | 매수잔량",
    ]

    for i, unit in enumerate(units, 1):
        ask_price = format_krw(unit.get("ask_price"))
        ask_size = format_float(unit.get("ask_size"), 6)
        bid_price = format_krw(unit.get("bid_price"))
        bid_size = format_float(unit.get("bid_size"), 6)
        lines.append(f"{i} | {ask_price} | {ask_size} | {bid_price} | {bid_size}")

    return "\n".join(lines)


@mcp.tool()
async def get_recent_trades(market: str = "KRW-BTC", count: int = 10) -> str:
    """
    업비트 최근 체결 내역을 조회합니다.
    count는 1~50 사이로 제한합니다.
    """
    market = normalize_market(market)
    count = max(1, min(int(count), 50))

    data = await get_json("/trades/ticks", {"market": market, "count": count})

    if not data:
        return f"최근 체결 데이터를 찾지 못했습니다: {market}"

    lines = [
        f"업비트 최근 체결 내역",
        f"마켓: {market}",
        "",
        "순번 | 체결시각(UTC) | 매수/매도 | 체결가 | 체결량 | 체결금액",
    ]

    for i, item in enumerate(data, 1):
        side = item.get("ask_bid", "")
        side_kr = "매수" if side == "BID" else "매도" if side == "ASK" else side
        price = float(item.get("trade_price", 0))
        volume = float(item.get("trade_volume", 0))
        amount = price * volume
        lines.append(
            f"{i} | {item.get('trade_time_utc')} UTC | {side_kr} | "
            f"{format_krw(price)} | {format_float(volume, 8)} | {format_krw(amount)}"
        )

    return "\n".join(lines)


@mcp.tool()
async def get_market_summary(market: str = "KRW-BTC") -> str:
    """
    현재가와 최상단 호가를 함께 조회해서 간단한 마켓 요약 정보를 제공합니다.
    """
    market = normalize_market(market)
    ticker_data = await get_json("/ticker", {"markets": market})
    orderbook_data = await get_json("/orderbook", {"markets": market, "count": 1})

    if not ticker_data or not orderbook_data:
        return f"마켓 요약 정보를 찾지 못했습니다: {market}"

    ticker = ticker_data[0]
    orderbook = orderbook_data[0]
    unit = orderbook.get("orderbook_units", [{}])[0]

    trade_price = float(ticker.get("trade_price", 0))
    ask_price = float(unit.get("ask_price", 0))
    bid_price = float(unit.get("bid_price", 0))
    spread = ask_price - bid_price
    spread_rate = (spread / trade_price * 100) if trade_price else 0

    return (
        f"업비트 마켓 요약\n"
        f"마켓: {market}\n"
        f"현재가: {format_krw(trade_price)}\n"
        f"최우선 매도호가: {format_krw(ask_price)}\n"
        f"최우선 매수호가: {format_krw(bid_price)}\n"
        f"스프레드: {format_krw(spread)} ({spread_rate:.4f}%)\n"
        f"24시간 누적 거래대금: {format_krw(ticker.get('acc_trade_price_24h'))}"
    )


@mcp.tool()
async def compare_markets(markets: str = "KRW-BTC,KRW-ETH,KRW-XRP") -> str:
    """
    여러 코인의 현재가, 전일 대비율, 24시간 거래대금을 한 번에 비교합니다.
    markets 예: KRW-BTC,KRW-ETH 또는 BTC,ETH,XRP
    """
    market_list = normalize_markets(markets)
    data = await get_json("/ticker", {"markets": ",".join(market_list)})

    if not data:
        return f"비교할 마켓 데이터를 찾지 못했습니다: {', '.join(market_list)}"

    lines = [
        "업비트 코인 비교",
        f"대상: {', '.join(market_list)}",
        "",
        "마켓 | 현재가 | 전일 대비 | 24시간 거래대금",
    ]
    for item in data:
        lines.append(
            f"{item.get('market')} | {format_krw(item.get('trade_price'))} | "
            f"{format_percent(item.get('signed_change_rate'))} | "
            f"{format_krw(item.get('acc_trade_price_24h'))}"
        )
    return "\n".join(lines)


@mcp.tool()
async def get_minute_candles(market: str = "KRW-BTC", unit: int = 60, count: int = 5) -> str:
    """
    업비트 분봉 캔들 데이터를 조회합니다. 단기 가격 흐름 확인용입니다.
    unit 예: 1, 3, 5, 10, 15, 30, 60, 240 / count는 1~20
    """
    market = normalize_market(market)
    allowed_units = {1, 3, 5, 10, 15, 30, 60, 240}
    unit = int(unit)
    if unit not in allowed_units:
        unit = 60
    count = max(1, min(int(count), 20))

    data = await get_json(f"/candles/minutes/{unit}", {"market": market, "count": count})

    if not data:
        return f"캔들 데이터를 찾지 못했습니다: {market}"

    lines = [
        f"업비트 {unit}분봉 캔들 데이터",
        f"마켓: {market}",
        "",
        "순번 | 시각(KST) | 시가 | 고가 | 저가 | 종가 | 거래대금",
    ]
    for i, item in enumerate(data, 1):
        lines.append(
            f"{i} | {item.get('candle_date_time_kst')} | "
            f"{format_krw(item.get('opening_price'))} | "
            f"{format_krw(item.get('high_price'))} | "
            f"{format_krw(item.get('low_price'))} | "
            f"{format_krw(item.get('trade_price'))} | "
            f"{format_krw(item.get('candle_acc_trade_price'))}"
        )
    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run()
