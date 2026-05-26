/* KUSDC PayGuard - Real GIWA / MetaMask / Nodit integration */

const CONFIG = {
  chainIdDecimal: 91342,
  chainIdHex: '0x164ce',
  chainName: 'GIWA Sepolia Testnet',
  rpcUrl: 'https://giwa-sepolia.nodit.io/',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  kusdcAddress: '0xDD3ebD39c386e63CBDD9c8640F97C311BaB5fF21',
  cafeAddress: '0x15168Ed0B2de2f830f38a6Da544512D3D6426489',
};

const KUSDC_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function paused() view returns (bool)',
  'function isBlacklisted(address account) view returns (bool)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

const CAFE_ABI = [
  'function pay(address token, uint256 amount)',
  'function payWithAuthorization(address token,uint256 amount,uint256 validAfter,uint256 validBefore,bytes32 nonce,uint8 v,bytes32 r,bytes32 s)',
  'function addWhitelistedToken(address token)',
  'function whitelistedTokens(address token) view returns (bool)',
  'function merchant() view returns (address)',
  'function feeRate() view returns (uint256)',
  'function FEE_DENOMINATOR() view returns (uint256)',
  'function owner() view returns (address)',
  'function withdrawFees(address token)',
  'event Paid(address indexed payer,address indexed token,uint256 amount,uint256 fee,string method,uint256 timestamp)',
  'event TokenWhitelisted(address indexed token)'
];

const menuItems = [
  { id: 'americano', name: 'Americano', price: 3.0, emoji: '☕', desc: '기본 결제 시연 메뉴' },
  { id: 'latte', name: 'Cafe Latte', price: 4.5, emoji: '🥛', desc: '소수점 KUSDC 결제 확인' },
  { id: 'ade', name: 'Lemon Ade', price: 5.0, emoji: '🍋', desc: '수량 변경 테스트용' },
  { id: 'cake', name: 'Cheese Cake', price: 6.0, emoji: '🍰', desc: '정산 금액 증가 확인' },
];

const $ = (id) => document.getElementById(id);
const state = {
  selectedId: 'latte',
  qty: 1,
  provider: null,
  signer: null,
  account: '',
  kusdc: null,
  cafe: null,
  decimals: 6,
  feeRate: 100n,
  feeDenominator: 10000n,
  lastTxHash: '',
  lastTx: null,
  transactions: loadTransactions(),
  balanceUnits: null,
  allowanceUnits: null,
  whitelisted: null,
  paused: null,
  blacklisted: null,
  latestBlock: null,
  approveConfirmed: false,
  payConfirmed: false,
  noditVerified: false,
};

if (state.transactions.length) {
  state.lastTx = { ...state.transactions[0] };
  state.lastTxHash = state.lastTx.hash || '';
  state.payConfirmed = state.lastTx.status === 'SUCCESS';
  state.noditVerified = state.lastTx.status === 'SUCCESS';
}

function ensureEthersLoaded() {
  if (!window.ethers) {
    throw new Error('ethers.js가 로드되지 않았습니다. 인터넷 연결을 확인하거나 CDN 접속이 가능한지 확인하세요.');
  }
}

function shortAddress(value) {
  if (!value) return '-';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function nowTime() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function log(message, type = 'info') {
  const prefix = type === 'error' ? '❌' : type === 'ok' ? '✅' : type === 'warn' ? '⚠️' : '•';
  $('logBox').textContent = `[${nowTime()}] ${prefix} ${message}\n` + $('logBox').textContent;
}

function getSelectedItem() {
  return menuItems.find((item) => item.id === state.selectedId) || menuItems[0];
}

function getAmountNumber() {
  return getSelectedItem().price * state.qty;
}

function amountToUnits(amount = getAmountNumber()) {
  return ethers.parseUnits(Number(amount).toFixed(state.decimals), state.decimals);
}

function formatKusdcFromUnits(value) {
  try {
    return `${Number(ethers.formatUnits(value || 0n, state.decimals)).toFixed(2)} KUSDC`;
  } catch {
    return '-';
  }
}

function formatKusdcNumber(value) {
  return `${Number(value || 0).toFixed(2)} KUSDC`;
}

function feeForAmount(amount) {
  return amount * Number(state.feeRate) / Number(state.feeDenominator || 10000n);
}

function saveTransactions() {
  localStorage.setItem('kusdc_payguard_transactions', JSON.stringify(state.transactions.slice(0, 20)));
}

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem('kusdc_payguard_transactions') || '[]');
  } catch {
    return [];
  }
}

function getCurrentPage() {
  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/customer') return 'customer';
  if (path === '/admin') return 'admin';
  return 'portal';
}

function applyPageMode() {
  const page = getCurrentPage();
  document.body.dataset.page = page;
  const badge = $('pageModeBadge');
  const customerLink = $('customerLink');
  const adminLink = $('adminLink');
  if (badge) {
    if (page === 'customer') {
      badge.textContent = 'CUSTOMER PAGE';
      badge.className = 'pill ok';
    } else if (page === 'admin') {
      badge.textContent = 'ADMIN PAGE';
      badge.className = 'pill ok';
    } else {
      badge.textContent = 'SERVICE PORTAL';
      badge.className = 'pill muted';
    }
  }
  if (customerLink) customerLink.classList.toggle('active', page === 'customer');
  if (adminLink) adminLink.classList.toggle('active', page === 'admin');

  const connectBtn = $('connectBtn');
  if (connectBtn && !state.account) {
    connectBtn.textContent = page === 'admin' ? '관리자 지갑 연결' : 'MetaMask 연결';
  }

  const hero = $('heroSection');
  if (hero) {
    const title = hero.querySelector('h2');
    const desc = hero.querySelector('.hero-desc');
    if (page === 'customer') {
      title.innerHTML = '고객은 결제하고,<br><span>PayGuard가 검증합니다</span>';
      desc.textContent = '고객 화면에서는 메뉴 선택, KUSDC approve/pay 결제, Tx Hash 영수증, QR 영수증, AI 결제 요약만 제공합니다. 관리자 매출 정보는 보이지 않습니다.';
    } else if (page === 'admin') {
      title.innerHTML = '사장님은 한눈에,<br><span>매출·정산·리스크를 확인합니다</span>';
      desc.textContent = '관리자 화면에서는 성공 거래를 기준으로 총 매출, 서비스 수수료, 정산 예정 금액, 최근 Tx 목록, 컨트랙트 리스크 상태를 확인합니다.';
    } else {
      title.innerHTML = '결제만 하는 DApp에서<br><span>결제를 검증하고 설명하는 DApp</span>으로';
      desc.textContent = '실제 서비스처럼 고객 결제 화면과 관리자 정산 화면을 분리했습니다. 발표 시에는 고객 화면에서 결제 후, 관리자 화면에서 정산과 리스크 리포트를 확인하면 됩니다.';
    }
  }
}


async function rpc(method, params = []) {
  const payload = { jsonrpc: '2.0', id: Date.now(), method, params };
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    const message = data?.error?.message || data?.message || data?.error || `RPC error: ${method}`;
    throw new Error(message);
  }
  return data.result;
}

async function checkServer() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    $('serverStatus').textContent = data.hasNoditApiKey ? 'Nodit proxy ready · API key loaded' : 'Nodit proxy ready · no API key';
    $('serverStatus').className = data.hasNoditApiKey ? 'pill ok' : 'pill muted';
    log(`Local server connected. Nodit endpoint: ${data.noditRpcUrl}`, 'ok');
  } catch (error) {
    $('serverStatus').textContent = 'Server not connected';
    $('serverStatus').className = 'pill bad';
    log('server.js로 실행해야 Nodit 검증이 안정적으로 동작합니다.', 'warn');
  }
}

function renderMenus() {
  $('menuGrid').innerHTML = menuItems.map((item) => `
    <button class="menu-card ${item.id === state.selectedId ? 'selected' : ''}" data-menu-id="${item.id}">
      <span class="menu-top"><span class="menu-emoji">${item.emoji}</span><span class="menu-price">${formatKusdcNumber(item.price)}</span></span>
      <span class="menu-name">${item.name}</span>
      <span class="menu-desc">${item.desc}</span>
    </button>
  `).join('');
  document.querySelectorAll('[data-menu-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedId = btn.dataset.menuId;
      render();
    });
  });
}

function renderTotals() {
  $('qtyText').textContent = state.qty;
  $('amountText').textContent = formatKusdcNumber(getAmountNumber());
  $('decimalsText').textContent = String(state.decimals);
}

function renderTransactions() {
  const tbody = $('txTableBody');
  if (!state.transactions.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="center muted-text">아직 저장된 결제 내역이 없습니다.</td></tr>';
  } else {
    tbody.innerHTML = state.transactions.map((tx) => `
      <tr>
        <td>${tx.time}</td>
        <td>${tx.menu}</td>
        <td>${formatKusdcNumber(tx.amount)}</td>
        <td><span class="status ${tx.status === 'SUCCESS' ? 'success' : tx.status === 'FAILED' ? 'failed' : 'pending'}">${tx.status}</span></td>
        <td title="${tx.hash}">${shortAddress(tx.hash)}</td>
      </tr>
    `).join('');
  }

  const success = state.transactions.filter((tx) => tx.status === 'SUCCESS');
  const total = success.reduce((sum, tx) => sum + tx.amount, 0);
  const fees = success.reduce((sum, tx) => sum + tx.fee, 0);
  $('successCount').textContent = `${success.length}건`;
  $('totalSales').textContent = formatKusdcNumber(total);
  $('totalFee').textContent = formatKusdcNumber(fees);
  $('totalSettlement').textContent = formatKusdcNumber(total - fees);
  renderAdminAiReport();
}

function renderReceipt() {
  if (!state.lastTx) {
    $('receiptEmpty').classList.remove('hidden');
    $('receiptCard').classList.add('hidden');
    $('aiSummary').textContent = '결제가 실행되면 AI 요약 문장이 자동으로 생성됩니다.';
    renderPresentationWidgets();
    return;
  }

  const tx = state.lastTx;
  $('receiptEmpty').classList.add('hidden');
  $('receiptCard').classList.remove('hidden');
  $('receiptMenu').textContent = tx.menu;
  $('receiptAmount').textContent = formatKusdcNumber(tx.amount);
  $('receiptFee').textContent = formatKusdcNumber(tx.fee);
  $('receiptSettlement').textContent = formatKusdcNumber(tx.amount - tx.fee);
  $('receiptBlock').textContent = tx.block || '-';
  $('receiptHash').textContent = tx.hash || '-';
  $('receiptStatus').textContent = tx.status;
  $('receiptStatus').className = `status ${tx.status === 'SUCCESS' ? 'success' : tx.status === 'FAILED' ? 'failed' : 'pending'}`;

  if (tx.status === 'SUCCESS') {
    $('aiSummary').textContent = `${tx.menu} 결제가 실제 블록체인에서 성공으로 검증되었습니다. Tx Hash는 ${shortAddress(tx.hash)}이고, 결제 금액은 ${formatKusdcNumber(tx.amount)}입니다. 수수료 ${formatKusdcNumber(tx.fee)}를 제외한 ${formatKusdcNumber(tx.amount - tx.fee)}가 카페 정산 예정 금액으로 계산됩니다.`;
  } else if (tx.status === 'FAILED') {
    $('aiSummary').textContent = `${tx.menu} 결제가 실패로 확인되었습니다. Tx Hash는 생성되었지만 receipt status가 성공이 아니므로, 잔액/allowance/whitelist/컨트랙트 pause 상태를 다시 확인해야 합니다.`;
  } else {
    $('aiSummary').textContent = `${tx.menu} 결제 트랜잭션이 전송되었습니다. 현재 Tx Hash ${shortAddress(tx.hash)}를 기준으로 Nodit 검증을 기다리는 중입니다.`;
  }
  renderPresentationWidgets();
}


function hasEnoughAllowanceForCurrentAmount() {
  try {
    return state.allowanceUnits !== null && state.allowanceUnits >= amountToUnits();
  } catch {
    return false;
  }
}

function paymentSucceeded() {
  return state.lastTx?.status === 'SUCCESS' && Number(state.lastTx?.fee || 0) > 0;
}

function getRiskLevel() {
  const failed = state.lastTx?.status === 'FAILED';
  const dangerous = failed || state.paused === true || state.blacklisted === true || state.whitelisted === false;
  const low = paymentSucceeded() && state.lastTx?.block && state.lastTx.block !== '-' && state.whitelisted !== false && state.paused !== true && state.blacklisted !== true;
  if (dangerous) return 'HIGH';
  if (low) return 'LOW';
  return 'MEDIUM';
}

function renderFlowTimeline() {
  const steps = [
    { title: 'Wallet Connected', desc: 'MetaMask 지갑 연결', done: !!state.account },
    { title: 'KUSDC Balance Checked', desc: '잔액/decimals 조회 완료', done: state.balanceUnits !== null },
    { title: 'Approve Confirmed', desc: 'KUSDC 지출 한도 승인', done: state.approveConfirmed || hasEnoughAllowanceForCurrentAmount() || paymentSucceeded() },
    { title: 'Pay Transaction Confirmed', desc: 'CafePayment.pay 컨펌', done: state.payConfirmed || paymentSucceeded() },
    { title: 'Tx Hash Generated', desc: '블록체인 거래번호 생성', done: !!state.lastTx?.hash },
    { title: 'Nodit Verification Success', desc: 'Nodit receipt SUCCESS 검증', done: state.noditVerified || paymentSucceeded() },
    { title: 'AI Summary Generated', desc: '사용자/관리자 요약 생성', done: state.lastTx?.status === 'SUCCESS' || state.lastTx?.status === 'FAILED' },
  ];

  const el = $('flowTimeline');
  if (!el) return;
  el.innerHTML = steps.map((step, index) => `
    <div class="flow-step ${step.done ? 'done' : 'pending'}">
      <div class="flow-step-number">${step.done ? '✓' : index + 1}</div>
      <span class="flow-step-title">${step.title}</span>
      <span class="flow-step-desc">${step.desc}</span>
    </div>
  `).join('');
}

function riskValueText(value, okLabel, badLabel, waitLabel = '대기') {
  if (value === true) return { text: okLabel, cls: 'ok' };
  if (value === false) return { text: badLabel, cls: 'bad' };
  return { text: waitLabel, cls: 'warn' };
}

function renderRiskScore() {
  if (!$('riskChecks')) return;
  const level = getRiskLevel();
  const levelClass = level.toLowerCase();
  $('riskScoreText').textContent = level;
  $('riskBadge').textContent = level === 'LOW' ? 'LOW RISK' : level === 'HIGH' ? 'HIGH RISK' : 'CHECKING';
  $('riskBadge').className = `risk-badge ${levelClass}`;

  const txStatus = state.lastTx?.status || 'PENDING';
  const txOk = txStatus === 'SUCCESS';
  const blockOk = !!state.lastTx?.block && state.lastTx.block !== '-';
  const allowanceOk = state.approveConfirmed || hasEnoughAllowanceForCurrentAmount() || paymentSucceeded();
  const whitelist = riskValueText(state.whitelisted, 'true ✅', 'false ❌');
  const paused = state.paused === null ? { text: '대기', cls: 'warn' } : state.paused === false ? { text: 'false ✅', cls: 'ok' } : { text: 'true ⚠️', cls: 'bad' };
  const blacklisted = state.blacklisted === null ? { text: '대기', cls: 'warn' } : state.blacklisted === false ? { text: 'false ✅', cls: 'ok' } : { text: 'true ❌', cls: 'bad' };
  const checks = [
    ['네트워크 확인', state.account ? `${CONFIG.chainName} ✅` : '지갑 연결 전', state.account ? 'ok' : 'warn'],
    ['Tx Status', txOk ? 'SUCCESS ✅' : txStatus === 'FAILED' ? 'FAILED ❌' : 'PENDING', txOk ? 'ok' : txStatus === 'FAILED' ? 'bad' : 'warn'],
    ['Block Number 확인', blockOk ? `${state.lastTx.block} ✅` : '대기', blockOk ? 'ok' : 'warn'],
    ['Whitelist 상태', whitelist.text, whitelist.cls],
    ['Paused 상태', paused.text, paused.cls],
    ['Blacklist 상태', blacklisted.text, blacklisted.cls],
    ['Allowance 검증', allowanceOk ? 'approve 완료 ✅' : 'approve 필요', allowanceOk ? 'ok' : 'warn'],
  ];
  $('riskChecks').innerHTML = checks.map(([label, value, cls]) => `
    <div class="risk-check"><span>${label}</span><span class="${cls}">${value}</span></div>
  `).join('');
}

function renderAiReceiptCard() {
  if (!$('aiReceiptText')) return;
  const tx = state.lastTx;
  if (!tx) {
    $('aiReceiptText').textContent = '결제 성공 후 AI가 메뉴, 금액, 수수료, 정산 금액, Tx Hash, Block Number를 이용해 영수증 문장을 생성합니다.';
    return;
  }
  const risk = getRiskLevel();
  if (tx.status === 'SUCCESS') {
    $('aiReceiptText').textContent = `${tx.menu} 결제가 정상적으로 완료되었습니다. 결제 금액은 ${formatKusdcNumber(tx.amount)}이고, 서비스 수수료 ${formatKusdcNumber(tx.fee)}를 제외한 정산 예정 금액은 ${formatKusdcNumber(tx.amount - tx.fee)}입니다. Tx Hash ${shortAddress(tx.hash)}와 Block Number ${tx.block}가 확인되어 온체인 검증이 완료되었습니다. 현재 거래 리스크는 ${risk}입니다.`;
  } else if (tx.status === 'FAILED') {
    $('aiReceiptText').textContent = `${tx.menu} 결제는 실패로 검증되었습니다. Tx Hash는 생성되었지만 receipt status가 실패이므로 잔액, approve, whitelist, pause, blacklist 상태를 다시 확인해야 합니다. 현재 거래 리스크는 ${risk}입니다.`;
  } else {
    $('aiReceiptText').textContent = `${tx.menu} 결제 트랜잭션이 전송되었습니다. Tx Hash ${shortAddress(tx.hash)}를 기준으로 블록 반영과 Nodit 검증을 기다리고 있습니다.`;
  }
}

function renderQrReceipt() {
  const img = $('qrReceiptImg');
  if (!img) return;
  const tx = state.lastTx;
  if (!tx?.hash) {
    img.removeAttribute('src');
    img.alt = '결제 후 QR 영수증이 표시됩니다.';
    return;
  }
  const qrPayload = [
    'KUSDC PayGuard Receipt',
    `Menu: ${tx.menu}`,
    `Amount: ${formatKusdcNumber(tx.amount)}`,
    `Status: ${tx.status}`,
    `Block: ${tx.block || '-'}`,
    `TxHash: ${tx.hash}`,
    `Network: ${CONFIG.chainName}`,
  ].join('\n');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(qrPayload)}`;
  img.alt = `QR receipt for ${shortAddress(tx.hash)}`;
}

function renderAdminAiReport() {
  if (!$('adminAiReport')) return;
  const success = state.transactions.filter((tx) => tx.status === 'SUCCESS');
  const failed = state.transactions.filter((tx) => tx.status === 'FAILED');
  if (!state.transactions.length) {
    $('adminAiReport').textContent = '아직 결제 내역이 없습니다. 결제 성공 후 오늘의 매출, 수수료, 정산 예정 금액이 자동 요약됩니다.';
    return;
  }
  const total = success.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const fees = success.reduce((sum, tx) => sum + Number(tx.fee || 0), 0);
  const settlement = total - fees;
  const risk = failed.length > 0 ? 'MEDIUM' : getRiskLevel();
  $('adminAiReport').textContent = `오늘 총 ${success.length}건의 KUSDC 결제가 성공했습니다. 총 매출은 ${formatKusdcNumber(total)}이며, 서비스 수수료는 ${formatKusdcNumber(fees)}입니다. 최종 정산 예정 금액은 ${formatKusdcNumber(settlement)}입니다. 실패 거래는 ${failed.length}건이며, 현재 관리자 기준 리스크 수준은 ${risk}입니다.`;
}

function renderPresentationWidgets() {
  renderFlowTimeline();
  renderRiskScore();
  renderAiReceiptCard();
  renderQrReceipt();
  renderAdminAiReport();
}

function render() {
  applyPageMode();
  $('kusdcAddressText').textContent = CONFIG.kusdcAddress;
  $('cafeAddressText').textContent = CONFIG.cafeAddress;
  renderMenus();
  renderTotals();
  renderTransactions();
  renderReceipt();
  renderPresentationWidgets();
}

async function ensureChain() {
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId.toLowerCase() === CONFIG.chainIdHex.toLowerCase()) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CONFIG.chainIdHex }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CONFIG.chainIdHex,
          chainName: CONFIG.chainName,
          nativeCurrency: CONFIG.nativeCurrency,
          rpcUrls: [CONFIG.rpcUrl],
        }],
      });
    } else {
      throw switchError;
    }
  }
}

function initContracts() {
  state.kusdc = new ethers.Contract(CONFIG.kusdcAddress, KUSDC_ABI, state.signer);
  state.cafe = new ethers.Contract(CONFIG.cafeAddress, CAFE_ABI, state.signer);
}

async function connectWallet() {
  try {
    ensureEthersLoaded();
    if (!window.ethereum) throw new Error('MetaMask가 설치되어 있지 않습니다.');

    log('MetaMask 연결 요청 중...');
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    await ensureChain();
    state.provider = new ethers.BrowserProvider(window.ethereum);
    state.signer = await state.provider.getSigner();
    state.account = await state.signer.getAddress();
    initContracts();

    $('connectBtn').textContent = shortAddress(state.account);
    $('walletText').textContent = shortAddress(state.account);
    $('networkText').textContent = CONFIG.chainName;
    log(`Wallet connected: ${state.account}`, 'ok');
    await refreshOnChainState();
  } catch (error) {
    log(error.message, 'error');
    alert(error.message);
  }
}

async function refreshOnChainState() {
  if (!state.account || !state.kusdc || !state.cafe) {
    await connectWallet();
    return;
  }

  try {
    log('온체인 상태 조회 중...');
    const [decimals, balance, allowance, whitelisted, merchant, feeRate, feeDenom, latestBlockHex] = await Promise.all([
      state.kusdc.decimals(),
      state.kusdc.balanceOf(state.account),
      state.kusdc.allowance(state.account, CONFIG.cafeAddress),
      state.cafe.whitelistedTokens(CONFIG.kusdcAddress),
      state.cafe.merchant(),
      state.cafe.feeRate(),
      state.cafe.FEE_DENOMINATOR(),
      rpc('eth_blockNumber', []),
    ]);

    state.decimals = Number(decimals);
    state.feeRate = BigInt(feeRate);
    state.feeDenominator = BigInt(feeDenom);
    state.balanceUnits = balance;
    state.allowanceUnits = allowance;
    state.whitelisted = whitelisted;
    state.latestBlock = parseInt(latestBlockHex, 16);

    $('balanceText').textContent = formatKusdcFromUnits(balance);
    $('allowanceText').textContent = formatKusdcFromUnits(allowance);
    $('whitelistText').textContent = whitelisted ? 'true ✅' : 'false ❌';
    $('merchantText').textContent = merchant;
    $('feeRateText').textContent = `${(Number(feeRate) * 100 / Number(feeDenom)).toFixed(2)}% (${feeRate.toString()} / ${feeDenom.toString()})`;
    $('feeBalanceText').textContent = formatKusdcFromUnits(await state.kusdc.balanceOf(CONFIG.cafeAddress));
    $('latestBlockText').textContent = `${parseInt(latestBlockHex, 16)} (${latestBlockHex})`;

    try {
      const paused = await state.kusdc.paused();
      state.paused = Boolean(paused);
      $('pausedText').textContent = paused ? 'true ⚠️' : 'false ✅';
    } catch {
      state.paused = null;
      $('pausedText').textContent = 'not available';
    }
    try {
      const blacklisted = await state.kusdc.isBlacklisted(state.account);
      state.blacklisted = Boolean(blacklisted);
      $('blacklistedText').textContent = blacklisted ? 'true ❌' : 'false ✅';
    } catch {
      state.blacklisted = null;
      $('blacklistedText').textContent = 'not available';
    }

    renderTotals();
    renderPresentationWidgets();
    log('온체인 상태 조회 완료', 'ok');
  } catch (error) {
    log(`온체인 상태 조회 실패: ${error.message}`, 'error');
  }
}

async function approveKusdc() {
  if (!state.account) await connectWallet();
  const amountUnits = amountToUnits();
  const amountText = formatKusdcNumber(getAmountNumber());
  try {
    log(`KUSDC approve 시작: CafePayment가 ${amountText} 사용 가능하도록 승인`);
    const tx = await state.kusdc.approve(CONFIG.cafeAddress, amountUnits);
    log(`approve tx sent: ${tx.hash}`);
    state.noditVerified = false;
    state.lastTx = {
      menu: `Approve ${getSelectedItem().name}`,
      amount: getAmountNumber(),
      fee: 0,
      status: 'PENDING',
      hash: tx.hash,
      block: '-',
      time: nowTime(),
    };
    renderReceipt();
    const receipt = await tx.wait();
    state.approveConfirmed = true;
    log(`approve confirmed. block=${receipt.blockNumber}`, 'ok');
    await verifyByNodit(tx.hash, false);
    await refreshOnChainState();
    return tx.hash;
  } catch (error) {
    log(`approve 실패: ${extractError(error)}`, 'error');
    alert(`approve 실패\n\n${extractError(error)}`);
    throw error;
  }
}

async function payCafe() {
  if (!state.account) await connectWallet();
  const item = getSelectedItem();
  const amount = getAmountNumber();
  const amountUnits = amountToUnits(amount);
  const fee = feeForAmount(amount);

  try {
    const whitelisted = await state.cafe.whitelistedTokens(CONFIG.kusdcAddress);
    if (!whitelisted) {
      throw new Error('KUSDC가 CafePayment whitelist에 등록되어 있지 않습니다. Owner 지갑으로 whitelist 등록을 먼저 해야 합니다.');
    }

    const allowance = await state.kusdc.allowance(state.account, CONFIG.cafeAddress);
    if (allowance < amountUnits) {
      throw new Error(`allowance 부족: 먼저 approve를 실행해야 합니다. 필요 금액 ${formatKusdcNumber(amount)}`);
    }

    log(`CafePayment.pay 실제 결제 시작: ${item.name} x${state.qty}, ${formatKusdcNumber(amount)}`);
    const tx = await state.cafe.pay(CONFIG.kusdcAddress, amountUnits);
    log(`pay tx sent: ${tx.hash}`);

    state.payConfirmed = false;
    state.noditVerified = false;
    state.lastTx = {
      menu: `${item.name}${state.qty > 1 ? ` x${state.qty}` : ''}`,
      amount,
      fee,
      status: 'PENDING',
      hash: tx.hash,
      block: '-',
      time: nowTime(),
    };
    renderReceipt();

    const receipt = await tx.wait();
    state.payConfirmed = true;
    log(`pay confirmed by wallet provider. block=${receipt.blockNumber}`, 'ok');
    const verified = await verifyByNodit(tx.hash, true);
    await refreshOnChainState();
    return verified;
  } catch (error) {
    log(`pay 실패: ${extractError(error)}`, 'error');
    alert(`pay 실패\n\n${extractError(error)}`);
    throw error;
  }
}

async function approveAndPay() {
  if (!state.account) await connectWallet();
  try {
    const amountUnits = amountToUnits();
    const allowance = await state.kusdc.allowance(state.account, CONFIG.cafeAddress);
    if (allowance < amountUnits) {
      log('allowance가 부족해서 approve를 먼저 실행합니다.', 'warn');
      await approveKusdc();
    } else {
      log('allowance가 충분해서 approve를 생략하고 pay로 이동합니다.', 'ok');
    }
    await payCafe();
  } catch (error) {
    log(`통합 결제 흐름 중단: ${extractError(error)}`, 'error');
  }
}

async function verifyByNodit(hash = state.lastTxHash || state.lastTx?.hash, saveAsPayment = true) {
  if (!hash) {
    alert('검증할 Tx Hash가 없습니다.');
    return null;
  }
  try {
    log(`Nodit eth_getTransactionReceipt 검증 요청: ${hash}`);
    const [chainId, receipt] = await Promise.all([
      rpc('eth_chainId', []),
      rpc('eth_getTransactionReceipt', [hash]),
    ]);

    if (!receipt) {
      log('Nodit receipt가 아직 null입니다. 블록 반영 후 다시 검증하세요.', 'warn');
      if (state.lastTx) {
        state.lastTx.status = 'PENDING';
        renderReceipt();
      }
      return null;
    }

    const success = receipt.status === '0x1';
    const block = parseInt(receipt.blockNumber || '0x0', 16);
    log(`Nodit receipt status=${receipt.status}, chainId=${chainId}, block=${block}`, success ? 'ok' : 'error');

    if (state.lastTx && state.lastTx.hash.toLowerCase() === hash.toLowerCase()) {
      state.lastTx.status = success ? 'SUCCESS' : 'FAILED';
      state.lastTx.block = String(block);
      state.noditVerified = Boolean(success && saveAsPayment && Number(state.lastTx.fee || 0) > 0);
      state.lastTx.noditStatus = receipt.status;
      state.lastTx.chainId = chainId;
      renderReceipt();

      if (saveAsPayment && Number(state.lastTx.fee || 0) > 0 && !state.transactions.some((tx) => tx.hash.toLowerCase() === hash.toLowerCase())) {
        state.transactions.unshift({ ...state.lastTx });
        saveTransactions();
        renderTransactions();
      }
    }

    return receipt;
  } catch (error) {
    log(`Nodit 검증 실패: ${extractError(error)}`, 'error');
    alert(`Nodit 검증 실패\n\n${extractError(error)}\n\n.env의 NODIT_API_KEY 또는 NODIT_RPC_URL을 확인하세요.`);
    return null;
  }
}

async function whitelistKusdc() {
  if (!state.account) await connectWallet();
  try {
    log('KUSDC whitelist 등록 트랜잭션 요청 중...');
    const tx = await state.cafe.addWhitelistedToken(CONFIG.kusdcAddress);
    log(`whitelist tx sent: ${tx.hash}`);
    await tx.wait();
    await verifyByNodit(tx.hash, false);
    await refreshOnChainState();
    log('KUSDC whitelist 등록 완료', 'ok');
  } catch (error) {
    log(`whitelist 등록 실패: ${extractError(error)}`, 'error');
    alert(`whitelist 등록 실패\n\n${extractError(error)}\n\n연결된 지갑이 CafePayment owner가 아니면 실패합니다.`);
  }
}

async function mintKusdc() {
  if (!state.account) await connectWallet();
  try {
    const units = ethers.parseUnits('100', state.decimals);
    log(`내 지갑으로 100 KUSDC mint 요청 중: ${state.account}`);
    const tx = await state.kusdc.mint(state.account, units);
    log(`mint tx sent: ${tx.hash}`);
    await tx.wait();
    await verifyByNodit(tx.hash, false);
    await refreshOnChainState();
    log('100 KUSDC mint 완료', 'ok');
  } catch (error) {
    log(`mint 실패: ${extractError(error)}`, 'error');
    alert(`mint 실패\n\n${extractError(error)}\n\n연결된 지갑이 minter 권한이 없으면 실패합니다. 그 경우 Remix에서 mint를 실행하세요.`);
  }
}

function extractError(error) {
  const raw = error?.shortMessage || error?.reason || error?.info?.error?.message || error?.message || String(error);
  if (raw.includes('user rejected')) return '사용자가 MetaMask 요청을 거절했습니다.';
  if (raw.includes('insufficient funds')) return '테스트넷 ETH 가스비가 부족합니다. GIWA faucet에서 ETH를 받아야 합니다.';
  if (raw.includes('execution reverted')) return raw;
  return raw;
}

function bindEvents() {
  $('connectBtn').addEventListener('click', connectWallet);
  $('refreshBtn').addEventListener('click', refreshOnChainState);
  $('approveBtn').addEventListener('click', approveKusdc);
  $('payBtn').addEventListener('click', payCafe);
  $('approvePayBtn').addEventListener('click', approveAndPay);
  $('verifyBtn').addEventListener('click', () => verifyByNodit(undefined, true));
  $('whitelistBtn').addEventListener('click', whitelistKusdc);
  $('mintBtn').addEventListener('click', mintKusdc);
  $('minusQty').addEventListener('click', () => { state.qty = Math.max(1, state.qty - 1); render(); });
  $('plusQty').addEventListener('click', () => { state.qty = Math.min(9, state.qty + 1); render(); });
  $('copyHashBtn').addEventListener('click', async () => {
    if (!state.lastTx?.hash) return;
    await navigator.clipboard.writeText(state.lastTx.hash);
    log('Tx Hash copied', 'ok');
  });
  $('openExplorerBtn').addEventListener('click', async () => {
    if (!state.lastTx?.hash) return;
    await navigator.clipboard.writeText(state.lastTx.hash);
    alert('Tx Hash를 복사했습니다. 탐색기 또는 Nodit Console에 붙여넣어 확인하세요. QR 영수증에도 같은 Tx Hash가 포함되어 있습니다.');
  });

  if (window.ethereum) {
    window.ethereum.on?.('accountsChanged', () => window.location.reload());
    window.ethereum.on?.('chainChanged', () => window.location.reload());
  }
}

async function boot() {
  render();
  bindEvents();
  await checkServer();
  log('실제 연동 준비 완료. 1) MetaMask 연결 2) 상태 새로고침 3) approve/pay 순서로 시연하세요.', 'ok');
}

boot();
