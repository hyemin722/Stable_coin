# Upbit API Mapping

| MCP Tool | Upbit Public API Endpoint | Description |
|---|---|---|
| `get_market_list` | `/v1/market/all` | 거래 가능한 마켓 목록 조회 |
| `get_ticker` | `/v1/ticker` | 현재가 및 등락 정보 조회 |
| `get_orderbook` | `/v1/orderbook` | 호가창/주문장 조회 |
| `get_recent_trades` | `/v1/trades/ticks` | 최근 체결 내역 조회 |
| `get_market_summary` | `/v1/ticker`, `/v1/orderbook` | 현재가와 최우선 호가 기반 요약 |
| `compare_markets` | `/v1/ticker` | 여러 코인의 현재가, 등락률, 거래대금 비교 |
| `get_minute_candles` | `/v1/candles/minutes/{unit}` | 분봉 캔들 데이터 조회 |

본 프로젝트는 Upbit Public API만 사용하므로 API Key가 필요하지 않다.
