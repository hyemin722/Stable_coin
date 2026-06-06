# Upbit MCP Data Viewer

This project implements an MCP-based program for retrieving cryptocurrency market data from Upbit.  
The MCP server exposes Upbit quotation API features as tools, and the MCP client discovers and calls those tools through the MCP protocol.

## 1. Project Overview

The program is designed with a separated MCP server-client structure.

- **MCP Server**: retrieves coin price, orderbook, recent trades, market list, market summary, market comparison, and minute candle data from Upbit.
- **MCP Client**: connects to the server, checks available tools with `list_tools()`, and requests data with `call_tool()`.
- **Web UI**: provides a browser-based interface that calls the same MCP tools through a local backend.

## 2. Architecture

```text
CLI Client / Web Browser
        ↓
MCP Client Layer
        ↓ list_tools(), call_tool()
Upbit MCP Server
        ↓ HTTP request
Upbit Public API
        ↓ JSON response
Upbit MCP Server
        ↓ MCP tool result
CLI Output / Web UI Output
```

The key point is that Upbit data is not requested directly from the UI or CLI only.  
The request passes through the MCP client-server flow.

## 3. Repository Structure

```text
upbit-mcp-final-project/
├── README.md
├── README_KR.md
├── REPORT_KR.md
├── requirements.txt
├── pyproject.toml
├── web_app.py
├── run_demo_windows.bat
├── run_demo_with_log_windows.bat
├── run_ui_windows.bat
├── servers/
│   └── upbit_server.py
├── clients/
│   └── test_upbit_client.py
├── web/
│   └── index.html
├── docs/
│   ├── api_mapping.md
│   ├── demo_script_kr.md
│   ├── mcp_structure_kr.md
│   └── ui_guide.md
├── assets/
│   └── screenshots/
├── logs/
└── scripts/
    └── syntax_check_windows.bat
```

## 4. MCP Tools

The MCP server is implemented in `servers/upbit_server.py`.

| Tool | Description |
|---|---|
| `get_market_list` | Lists available Upbit markets. |
| `get_ticker` | Retrieves current ticker and price information. |
| `get_orderbook` | Retrieves orderbook / bid-ask data. |
| `get_recent_trades` | Retrieves recent trade history. |
| `get_market_summary` | Summarizes current price, best ask, best bid, and spread. |
| `compare_markets` | Compares multiple coins by price, change rate, and 24-hour volume. |
| `get_minute_candles` | Retrieves minute candle data for short-term trend checking. |

## 5. Upbit API Mapping

| MCP Tool | Upbit Public API Endpoint |
|---|---|
| `get_market_list` | `/v1/market/all` |
| `get_ticker` | `/v1/ticker` |
| `get_orderbook` | `/v1/orderbook` |
| `get_recent_trades` | `/v1/trades/ticks` |
| `get_market_summary` | `/v1/ticker` + `/v1/orderbook` |
| `compare_markets` | `/v1/ticker` |
| `get_minute_candles` | `/v1/candles/minutes/{unit}` |

Only public quotation APIs are used, so no Upbit API key or secret key is required.

## 6. Setup on Windows

```bash
cd C:\Users\user\Desktop\upbit-mcp-final-project
py -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

## 7. CLI Execution

```bash
python clients/test_upbit_client.py
```

The CLI client performs the following process:

```text
1. Initialize MCP session
2. Discover server tools with list_tools()
3. Call tools with call_tool()
4. Print Upbit market data returned by the MCP server
```

The demo calls several MCP tools, including price lookup, orderbook lookup, recent trades, market summary, market comparison, and minute candle lookup.

## 8. Web UI Execution

```bash
python web_app.py
```

Open the following address in a browser.

```text
http://127.0.0.1:8765
```

The Web UI follows the same MCP flow.

```text
Browser UI → web_app.py → MCP ClientSession → Upbit MCP Server → Upbit Public API
```

Main UI functions:

- Tool list discovery
- Current price lookup
- Orderbook lookup
- Recent trades lookup
- Market summary
- Coin comparison
- Minute candle lookup

## 9. Development Check

```bash
python -m py_compile clients/test_upbit_client.py servers/upbit_server.py web_app.py
```

Windows helper script:

```bash
scripts\syntax_check_windows.bat
```

## 10. Summary

This project demonstrates an MCP-based Upbit data viewer.  
The MCP server provides Upbit market data tools, and the client verifies the server functionality through `list_tools()` and `call_tool()`.  
Both CLI and Web UI modes use the MCP flow, making the server-client separation clear.
