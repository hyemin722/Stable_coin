// Optional CLI checker for GIWA Sepolia / Nodit JSON-RPC.
// Usage:
//   node tools/nodit-check.js --account 0x... --payTx 0x...

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}
loadEnv();

const args = Object.fromEntries(process.argv.slice(2).reduce((arr, cur, idx, src) => {
  if (cur.startsWith('--')) arr.push([cur.slice(2), src[idx + 1]]);
  return arr;
}, []));

const RPC_URL = process.env.NODIT_RPC_URL || 'https://giwa-sepolia.nodit.io/';
const API_KEY = process.env.NODIT_API_KEY || '';

async function rpc(method, params = []) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (API_KEY) headers['X-API-KEY'] = API_KEY;
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result;
}

(async () => {
  try {
    console.log('Nodit RPC URL:', RPC_URL);
    console.log('API Key:', API_KEY ? 'loaded' : 'not set');

    const chainId = await rpc('eth_chainId', []);
    console.log('eth_chainId:', chainId, `(${parseInt(chainId, 16)})`);
    console.log(parseInt(chainId, 16) === 91342 ? '✅ GIWA Sepolia 체인 확인' : '⚠️ Chain ID가 91342가 아닙니다.');

    const block = await rpc('eth_blockNumber', []);
    console.log('eth_blockNumber:', block, `(${parseInt(block, 16)})`);

    if (args.payTx) {
      const receipt = await rpc('eth_getTransactionReceipt', [args.payTx]);
      console.log('eth_getTransactionReceipt:', JSON.stringify(receipt, null, 2));
      if (receipt?.status === '0x1') console.log('✅ pay transaction success');
      else if (receipt) console.log('❌ pay transaction failed or reverted');
      else console.log('⚠️ receipt is null. Wait a few seconds and try again.');
    } else {
      console.log('payTx not provided. Add --payTx 0x... to check a receipt.');
    }
  } catch (error) {
    console.error('❌ Nodit check failed:', error.message);
    process.exit(1);
  }
})();
