# Web UI Guide

## 1. 실행

```bash
python web_app.py
```

브라우저에서 다음 주소로 접속한다.

```text
http://127.0.0.1:8765
```

## 2. Web UI 구조

```text
Browser UI
  → web_app.py
  → MCP ClientSession
  → Upbit MCP Server
  → Upbit Public API
```

Web UI는 정적 화면만 제공하는 것이 아니라, 로컬 백엔드가 MCP 클라이언트 역할을 수행하여 MCP 서버 tool을 호출한다.

## 3. 주요 기능

- Tool 목록 확인
- 현재가 조회
- 호가창/주문장 조회
- 최근 체결 내역 조회
- 마켓 요약 조회
- 코인 비교
- 분봉 캔들 조회
