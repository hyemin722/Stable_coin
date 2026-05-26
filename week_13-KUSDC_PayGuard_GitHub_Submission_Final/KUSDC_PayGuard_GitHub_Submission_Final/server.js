// KUSDC PayGuard - Real GIWA/Nodit integration server
// Node.js 18+ required. No npm install needed.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 5173);
const NODIT_RPC_URL = process.env.NODIT_RPC_URL || 'https://giwa-sepolia.nodit.io/';
const NODIT_API_KEY = process.env.NODIT_API_KEY || '';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let safePath = decodeURIComponent(pathname);
  // 실제 서비스처럼 /customer, /admin URL을 분리해서 보여주되, 같은 앱 파일을 제공합니다.
  if (safePath === '/' || safePath === '/customer' || safePath === '/admin') safePath = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      noditRpcUrl: NODIT_RPC_URL,
      hasNoditApiKey: Boolean(NODIT_API_KEY),
      chainIdDecimal: 91342,
      chainIdHex: '0x164ce',
    });
    return;
  }

  if (requestUrl.pathname === '/api/rpc' && req.method === 'POST') {
    try {
      const rawBody = await readBody(req);
      const rpcPayload = JSON.parse(rawBody || '{}');
      if (!rpcPayload || rpcPayload.jsonrpc !== '2.0' || !rpcPayload.method) {
        sendJson(res, 400, { error: 'Invalid JSON-RPC payload' });
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (NODIT_API_KEY) headers['X-API-KEY'] = NODIT_API_KEY;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18_000);
      const rpcRes = await fetch(NODIT_RPC_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpcPayload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const text = await rpcRes.text();
      res.writeHead(rpcRes.status, {
        'Content-Type': rpcRes.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(text);
    } catch (error) {
      sendJson(res, 502, {
        error: 'Nodit RPC proxy failed',
        message: error.message,
        hint: 'Check NODIT_RPC_URL and NODIT_API_KEY in .env',
      });
    }
    return;
  }

  serveStatic(req, res, requestUrl.pathname);
});

server.listen(PORT, () => {
  console.log('============================================================');
  console.log('KUSDC PayGuard real integration server started');
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Nodit RPC: ${NODIT_RPC_URL}`);
  console.log(`Nodit API Key: ${NODIT_API_KEY ? 'loaded' : 'not set'}`);
  console.log('============================================================');
});
