// ============================================================
//  Blockchain Lab #2 — Node.js HTTP 서버
//  Node.js 내장 모듈 + ethers.js (트랜잭션 서명용)
// ============================================================

var http = require('http');
var fs = require('fs');
var path = require('path');
var https = require('https');
var ethers = require('ethers');

var PORT = 5500;

// CoinGecko API 설정
// BTC, ETH의 USD/KRW 가격 + 24시간 변동률 + 시가총액을 한 번에 요청
var COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,krw&include_24hr_change=true&include_market_cap=true';

// 메모리 캐시 — CoinGecko 무료 호출 제한(분당 10~30회) 대응
var priceCache = {
  data: null,       // 캐시된 JSON 데이터
  timestamp: 0,     // 마지막 갱신 시각 (ms)
};
var CACHE_DURATION = 30000; // 캐시 유효 시간: 30초

// MIME 타입 매핑 — 브라우저가 파일을 올바르게 해석하도록 Content-Type 헤더 설정
var MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ────────────────────────────────────────────
//  CoinGecko API 프록시
// ────────────────────────────────────────────

/**
 * CoinGecko API를 서버에서 대신 호출 (CORS 문제 없음)
 * 캐시가 유효하면 캐시 반환, 아니면 새로 요청
 */
function fetchCoinGecko(callback) {
  var now = Date.now();

  // 캐시가 유효하면 즉시 반환
  if (priceCache.data && (now - priceCache.timestamp) < CACHE_DURATION) {
    callback(null, priceCache.data);
    return;
  }

  // CoinGecko API에 HTTPS GET 요청 (User-Agent 헤더 필수)
  var options = {
    hostname: 'api.coingecko.com',
    path: '/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,krw&include_24hr_change=true&include_market_cap=true',
    headers: { 'User-Agent': 'BlockchainLab2/1.0' },
  };

  https.get(options, function (apiRes) {
    var body = '';

    // 데이터가 조각(chunk)으로 도착 — 모두 모아야 완전한 JSON
    apiRes.on('data', function (chunk) {
      body += chunk;
    });

    // 모든 데이터 수신 완료
    apiRes.on('end', function () {
      try {
        var json = JSON.parse(body);
        // 캐시 갱신
        priceCache.data = json;
        priceCache.timestamp = Date.now();
        callback(null, json);
      } catch (e) {
        callback(new Error('JSON 파싱 실패'));
      }
    });
  }).on('error', function (err) {
    callback(err);
  });
}

// ────────────────────────────────────────────
//  Infura — 이더리움 블록 정보 조회
// ────────────────────────────────────────────

// Infura: 이더리움 노드에 접속할 수 있는 서비스 (JSON-RPC 방식)
var INFURA_URL = 'https://mainnet.infura.io/v3/ada7185a31a8460e858ac63d745b4147';

/**
 * Infura에 JSON-RPC 요청을 보내는 헬퍼 함수
 * JSON-RPC: 원격 서버에 함수를 호출하는 표준 프로토콜
 */
function infuraRPC(method, params, callback) {
  var postData = JSON.stringify({
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: 1,
  });

  var options = {
    hostname: 'mainnet.infura.io',
    path: '/v3/ada7185a31a8460e858ac63d745b4147',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  var req = https.request(options, function (apiRes) {
    var body = '';
    apiRes.on('data', function (chunk) { body += chunk; });
    apiRes.on('end', function () {
      try {
        var json = JSON.parse(body);
        callback(null, json);
      } catch (e) {
        callback(new Error('JSON 파싱 실패'));
      }
    });
  });

  req.on('error', function (err) { callback(err); });
  req.write(postData);
  req.end();
}

/**
 * 최신 이더리움 블록 번호 + 트랜잭션 수 조회
 * 1. eth_blockNumber → 최신 블록 번호 (16진수)
 * 2. eth_getBlockByNumber → 해당 블록의 트랜잭션 목록
 */
function fetchBlockInfo(callback) {
  // Step 1: 최신 블록 번호 가져오기
  infuraRPC('eth_blockNumber', [], function (err, result) {
    if (err || result.error) {
      callback(err || new Error(result.error.message));
      return;
    }

    var blockHex = result.result; // 예: "0x134a3b2"
    var blockNumber = parseInt(blockHex, 16); // 16진수 → 10진수

    // Step 2: 해당 블록의 상세 정보 가져오기 (트랜잭션 포함)
    // 두 번째 파라미터 true = 트랜잭션 상세 포함
    infuraRPC('eth_getBlockByNumber', [blockHex, false], function (err2, blockResult) {
      if (err2 || blockResult.error) {
        callback(err2 || new Error(blockResult.error.message));
        return;
      }

      var block = blockResult.result;
      callback(null, {
        blockNumber: blockNumber,
        blockHex: blockHex,
        transactionCount: block.transactions ? block.transactions.length : 0,
        timestamp: parseInt(block.timestamp, 16),
        gasUsed: parseInt(block.gasUsed, 16),
        miner: block.miner,
      });
    });
  });
}

// ────────────────────────────────────────────
//  Infura + ethers.js — 트랜잭션 조회 & Sepolia ETH 전송
// ────────────────────────────────────────────

var INFURA_API_KEY = 'ada7185a31a8460e858ac63d745b4147';

// ⚠️ 테스트넷 전용 Private Key — 실제 자산이 있는 키는 절대 코드에 넣지 마세요!
var PRIVATE_KEY = 'a690ebcc99a6306e4cbe52119eb2a374f5da35bc8765c87f7c93afe6aa375a90';

// Sepolia 테스트넷 Provider + Wallet 설정
var sepoliaProvider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/' + INFURA_API_KEY);
var wallet = new ethers.Wallet(PRIVATE_KEY, sepoliaProvider);

// 메인넷 Provider (트랜잭션 조회용)
var mainnetProvider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/' + INFURA_API_KEY);

/**
 * 트랜잭션 해시로 상세 정보 조회 (메인넷)
 * eth_getTransactionByHash → 보낸 사람, 받는 사람, 금액, 가스 등
 */
async function fetchTransaction(txHash) {
  // 메인넷에서 먼저 검색, 없으면 Sepolia 테스트넷에서 검색
  var tx = await mainnetProvider.getTransaction(txHash);
  var provider = mainnetProvider;
  var network = 'Mainnet';

  if (!tx) {
    tx = await sepoliaProvider.getTransaction(txHash);
    provider = sepoliaProvider;
    network = 'Sepolia Testnet';
  }

  if (!tx) return null;

  var receipt = await provider.getTransactionReceipt(txHash);

  return {
    hash: tx.hash,
    network: network,
    from: tx.from,
    to: tx.to,
    value: ethers.formatEther(tx.value) + ' ETH',
    gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') + ' Gwei' : 'N/A',
    gasUsed: receipt ? receipt.gasUsed.toString() : 'pending',
    status: receipt ? (receipt.status === 1 ? '성공' : '실패') : '대기중',
    blockNumber: tx.blockNumber,
  };
}

/**
 * Sepolia 테스트넷에서 ETH 전송
 * 서버의 Wallet → 지정된 주소로 ETH 송금
 */
async function sendSepoliaETH(toAddress, amountETH) {
  var tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amountETH),
  });

  // 트랜잭션이 블록에 포함될 때까지 대기
  var receipt = await tx.wait();

  return {
    hash: tx.hash,
    from: wallet.address,
    to: toAddress,
    amount: amountETH + ' ETH',
    blockNumber: receipt.blockNumber,
    status: receipt.status === 1 ? '성공' : '실패',
    sepoliaLink: 'https://sepolia.etherscan.io/tx/' + tx.hash,
  };
}

// ────────────────────────────────────────────
//  요청 본문(body) 파싱 헬퍼
// ────────────────────────────────────────────

function parseBody(req, callback) {
  var body = '';
  req.on('data', function (chunk) { body += chunk; });
  req.on('end', function () {
    try {
      callback(null, JSON.parse(body));
    } catch (e) {
      callback(new Error('잘못된 JSON 형식'));
    }
  });
}

// ────────────────────────────────────────────
//  정적 파일 서빙
// ────────────────────────────────────────────

/**
 * 정적 파일 서빙
 * 요청 URL에 해당하는 파일을 읽어서 응답한다.
 */
function serveStaticFile(req, res) {
  // URL에서 파일 경로 추출 ('/' → '/index.html')
  var urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  var filePath = path.join(__dirname, urlPath);

  // 보안: __dirname 밖의 파일 접근 차단 (디렉토리 트래버설 방지)
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    var ext = path.extname(filePath).toLowerCase();
    var contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// ────────────────────────────────────────────
//  HTTP 서버 생성 및 라우팅
// ────────────────────────────────────────────

var server = http.createServer(function (req, res) {
  // CORS 허용 — file:// 프로토콜에서도 API 호출 가능하도록
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  var urlPath = req.url.split('?')[0];

  // API 라우트: /api/tx?hash=0x... (트랜잭션 조회)
  if (urlPath === '/api/tx' && req.method === 'GET') {
    var urlObj = new URL(req.url, 'http://localhost');
    var txHash = urlObj.searchParams.get('hash');
    if (!txHash) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'hash 파라미터가 필요합니다. 예: /api/tx?hash=0x...' }));
      return;
    }
    fetchTransaction(txHash).then(function (data) {
      if (!data) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '트랜잭션을 찾을 수 없습니다.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    }).catch(function (err) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // API 라우트: /api/send-eth (Sepolia ETH 전송, POST)
  if (urlPath === '/api/send-eth' && req.method === 'POST') {
    parseBody(req, function (err, body) {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      if (!body.to || !body.amount) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'to(받는 주소)와 amount(ETH 수량)가 필요합니다.' }));
        return;
      }
      sendSepoliaETH(body.to, body.amount).then(function (result) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      }).catch(function (err) {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      });
    });
    return;
  }

  // API 라우트: /api/wallet-info (서버 지갑 정보)
  if (urlPath === '/api/wallet-info' && req.method === 'GET') {
    sepoliaProvider.getBalance(wallet.address).then(function (balance) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        address: wallet.address,
        network: 'Sepolia Testnet',
        balance: ethers.formatEther(balance) + ' ETH',
      }));
    }).catch(function (err) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // API 라우트: /api/block-info (Infura — 최신 블록 정보)
  if (urlPath === '/api/block-info' && req.method === 'GET') {
    fetchBlockInfo(function (err, data) {
      if (err) {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '블록 정보를 가져올 수 없습니다.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    });
    return;
  }

  // API 라우트: /api/prices (CoinGecko — 가격 정보)
  if (urlPath === '/api/prices' && req.method === 'GET') {
    fetchCoinGecko(function (err, data) {
      if (err) {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '가격 데이터를 가져올 수 없습니다.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    });
    return;
  }

  // 그 외: 정적 파일 서빙
  serveStaticFile(req, res);
});

server.listen(PORT, function () {
  console.log('');
  console.log('  ========================================');
  console.log('   Blockchain Lab #2 — Node.js 서버 실행');
  console.log('  ========================================');
  console.log('');
  console.log('   http://localhost:' + PORT);
  console.log('   종료: Ctrl+C');
  console.log('');
});
