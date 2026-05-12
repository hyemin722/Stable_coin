#!/usr/bin/env node
/*
 * GIWA Sepolia + Nodit verification helper
 *
 * Requirements:
 *   - Node.js 18+
 *   - NODIT_API_KEY environment variable
 *
 * Example:
 *   node scripts/nodit-check.js \
 *     --account 0xYOUR_WALLET_ADDRESS \
 *     --kusdc 0xKUSDC_CONTRACT_ADDRESS \
 *     --cafe 0xCAFEPAYMENT_CONTRACT_ADDRESS \
 *     --payTx 0xPAY_TRANSACTION_HASH
 */

const ENDPOINT = "https://giwa-sepolia.nodit.io/";
const EXPECTED_CHAIN_ID = 91342n;

const SELECTORS = {
  balanceOf: "0x70a08231",              // balanceOf(address)
  decimals: "0x313ce567",               // decimals()
  whitelistedTokens: "0xdaf9c210",      // whitelistedTokens(address)
  merchant: "0xa5ff7651",               // merchant()
  feeRate: "0x978bbdb9",                // feeRate()
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = value;
      i += 1;
    }
  }
  return args;
}

function requireFetch() {
  if (typeof fetch !== "function") {
    throw new Error("Node.js 18 이상이 필요합니다. 현재 환경에는 fetch가 없습니다.");
  }
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isTxHash(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value || "");
}

function padAddress(address) {
  if (!isAddress(address)) throw new Error(`Invalid address: ${address}`);
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function uintFromHex(hex) {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

function addressFromCallResult(hex) {
  if (!hex || hex.length < 66) return "0x0000000000000000000000000000000000000000";
  return `0x${hex.slice(-40)}`;
}

function boolFromCallResult(hex) {
  return uintFromHex(hex) === 1n;
}

function formatUnits(value, decimals) {
  const factor = 10n ** BigInt(decimals);
  const whole = value / factor;
  const fraction = value % factor;
  if (fraction === 0n) return whole.toString();
  const padded = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${padded}`;
}

async function rpc(method, params = []) {
  const apiKey = process.env.NODIT_API_KEY;
  if (!apiKey) {
    throw new Error("NODIT_API_KEY 환경변수를 먼저 설정하세요.");
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(`${method} failed: ${JSON.stringify(data.error || data)}`);
  }
  return data.result;
}

async function ethCall(to, data) {
  return rpc("eth_call", [{ to, data }, "latest"]);
}

async function main() {
  requireFetch();
  const args = parseArgs(process.argv);

  console.log("\n=== GIWA Sepolia + Nodit 검증 시작 ===\n");
  console.log(`Nodit endpoint: ${ENDPOINT}`);

  const chainIdHex = await rpc("eth_chainId");
  const chainId = uintFromHex(chainIdHex);
  console.log(`eth_chainId: ${chainIdHex} (${chainId.toString()})`);
  console.log(chainId === EXPECTED_CHAIN_ID ? "✅ GIWA Sepolia 체인 확인" : "⚠️ 예상 Chain ID와 다릅니다");

  const blockNumberHex = await rpc("eth_blockNumber");
  console.log(`eth_blockNumber: ${blockNumberHex} (${uintFromHex(blockNumberHex).toString()})`);

  if (args.payTx) {
    if (!isTxHash(args.payTx)) throw new Error("--payTx 값은 0x로 시작하는 32바이트 트랜잭션 해시여야 합니다.");
    const receipt = await rpc("eth_getTransactionReceipt", [args.payTx]);
    console.log("\n--- pay transaction receipt ---");
    if (!receipt) {
      console.log("아직 receipt가 없습니다. 트랜잭션이 확정될 때까지 잠시 기다린 뒤 다시 실행하세요.");
    } else {
      console.log(`status: ${receipt.status} ${receipt.status === "0x1" ? "✅ 성공" : "❌ 실패"}`);
      console.log(`blockNumber: ${receipt.blockNumber} (${uintFromHex(receipt.blockNumber).toString()})`);
      console.log(`from: ${receipt.from}`);
      console.log(`to: ${receipt.to}`);
      console.log(`gasUsed: ${receipt.gasUsed} (${uintFromHex(receipt.gasUsed).toString()})`);
      console.log(`logs: ${receipt.logs.length}`);
    }
  }

  if (args.kusdc && args.account) {
    if (!isAddress(args.kusdc)) throw new Error("--kusdc 값이 올바른 주소가 아닙니다.");
    if (!isAddress(args.account)) throw new Error("--account 값이 올바른 주소가 아닙니다.");

    const decimalsHex = await ethCall(args.kusdc, SELECTORS.decimals);
    const decimals = Number(uintFromHex(decimalsHex));
    const balanceHex = await ethCall(args.kusdc, SELECTORS.balanceOf + padAddress(args.account));
    const balance = uintFromHex(balanceHex);

    console.log("\n--- KUSDC balanceOf(account) by Nodit eth_call ---");
    console.log(`account: ${args.account}`);
    console.log(`raw balance: ${balance.toString()}`);
    console.log(`formatted balance: ${formatUnits(balance, decimals)} KUSDC`);
  }

  if (args.kusdc && args.cafe) {
    if (!isAddress(args.kusdc)) throw new Error("--kusdc 값이 올바른 주소가 아닙니다.");
    if (!isAddress(args.cafe)) throw new Error("--cafe 값이 올바른 주소가 아닙니다.");

    const whitelistedHex = await ethCall(args.cafe, SELECTORS.whitelistedTokens + padAddress(args.kusdc));
    const merchantHex = await ethCall(args.cafe, SELECTORS.merchant);
    const feeRateHex = await ethCall(args.cafe, SELECTORS.feeRate);
    const decimalsHex = await ethCall(args.kusdc, SELECTORS.decimals);
    const decimals = Number(uintFromHex(decimalsHex));
    const feeBalanceHex = await ethCall(args.kusdc, SELECTORS.balanceOf + padAddress(args.cafe));
    const feeBalance = uintFromHex(feeBalanceHex);

    console.log("\n--- CafePayment contract state by Nodit eth_call ---");
    console.log(`KUSDC whitelisted: ${boolFromCallResult(whitelistedHex)} ${boolFromCallResult(whitelistedHex) ? "✅" : "❌"}`);
    console.log(`merchant: ${addressFromCallResult(merchantHex)}`);
    console.log(`feeRate: ${uintFromHex(feeRateHex).toString()} basis points`);
    console.log(`CafePayment KUSDC fee balance: ${formatUnits(feeBalance, decimals)} KUSDC (${feeBalance.toString()} raw)`);
  }

  console.log("\n=== 검증 완료: 이 터미널 화면을 캡처해서 제출 자료에 추가하세요 ===\n");
}

main().catch((error) => {
  console.error("\n❌ Nodit 검증 실패");
  console.error(error.message);
  process.exit(1);
});
