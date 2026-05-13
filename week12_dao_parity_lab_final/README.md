# Week 12 DAO / Parity Smart Contract Security Lab

> **Local Hardhat simulation only.**  
> Live network, private key, RPC URL, faucet, wallet, real funds를 사용하지 않습니다.

이 패키지는 DAO Hack(2016), Parity Wallet Hack #1(2017), Parity Wallet Hack #2(2017)를 로컬 Hardhat 환경에서 재현하고, 취약점 원리와 수정 방법을 확인하기 위한 과제 제출용 폴더입니다.

## 1. Assignment objective

1. **DAO Reentrancy**  
   `withdraw()`에서 balance 감소보다 external call이 먼저 발생하면 재진입으로 DAO 잔액이 drain되는 것을 확인합니다.

2. **Parity #1: Unauthorized Initialization**  
   초기화되지 않은 proxy wallet이 `delegatecall`을 통해 library의 `initWallet()`을 실행하고, attacker가 proxy storage의 owner가 되는 것을 확인합니다.

3. **Parity #2: Library Self-Destruct**  
   여러 wallet이 하나의 shared library를 바라볼 때, library code가 제거되면 wallet의 ETH가 attacker에게 이동하는 것이 아니라 **frozen / loss of access** 상태가 되는 것을 확인합니다.

## 2. Safety boundary

- **Local Hardhat simulation only** (`--network hardhatMainnet`).
- `hardhatMainnet`은 `hardhat.config.js`에 정의된 local Hardhat in-memory network alias입니다.
- Ethereum mainnet이 아닙니다.
- No live network, no private key, no RPC URL.
- Vulnerable contracts는 교육용으로 의도적으로 unsafe하게 작성되어 있습니다.
- Scripts는 `logs/`에 evidence를 남기기 위한 local automation scripts입니다.

## 3. Quick start

Node.js와 npm이 설치되어 있어야 합니다.

```bash
cd week12_dao_parity_lab
npm ci
npm test
```

`npm ci`가 실패하면 `npm install`을 사용해도 됩니다.

개별 실행:

```bash
npm run compile        # local solc-js compiler를 사용해 artifacts 생성
npm run simulate:dao
npm run simulate:dao-fixes
npm run simulate:parity1
npm run simulate:parity2
```

실행 후 아래 로그가 regenerate / overwrite 됩니다.

- `logs/dao_attack.log`
- `logs/dao_fixes.log`
- `logs/parity1_attack.log`
- `logs/parity2_freeze.log`

> 참고: 이 zip에는 `package-lock.json`을 포함했습니다. `npm ci`를 권장하고, 환경에 따라 실패하면 `npm install`을 사용하면 됩니다. Hardhat의 온라인 compiler download 의존성을 줄이기 위해 `scripts/00_compile.js`에서 local `solc-js`로 컴파일합니다.

## 4. Repository structure

```text
week12_dao_parity_lab/
  contracts/
    dao/
      SimpleDAO.sol
      DAOAttacker.sol
      SimpleDAO_CEI.sol
      SimpleDAO_Guard.sol
      SimpleDAO_PullPayment.sol
    parity1/
      WalletLibraryVulnerable.sol
      WalletVulnerable.sol
      WalletFixed.sol
    parity2/
      SharedWalletLibraryVulnerable.sol
      SharedWallet.sol
      SharedWalletLibraryFixed.sol
  scripts/
    00_compile.js
    01_dao_attack.js
    02_dao_fixes.js
    03_parity1_attack.js
    04_parity2_freeze.js
    lib.js
  logs/
    dao_attack.log
    dao_fixes.log
    parity1_attack.log
    parity2_freeze.log
  diagrams/
    delegatecall_storage_collision.md
  screenshots/
    README.md
  hardhat.config.js
  package.json
  package-lock.json
  README.md
  REPORT_KR.md
```

## 5. Assignment-to-file mapping

| Assignment part | Demonstration | Core contracts | Run script | Evidence |
|---|---|---|---|---|
| DAO Reentrancy | external call before balance update allows recursive withdrawal | `contracts/dao/*` | `scripts/01_dao_attack.js`, `scripts/02_dao_fixes.js` | `logs/dao_attack.log`, `logs/dao_fixes.log` |
| Parity #1 | uninitialized proxy storage can be initialized by attacker through `delegatecall` | `contracts/parity1/*` | `scripts/03_parity1_attack.js` | `logs/parity1_attack.log`, `diagrams/delegatecall_storage_collision.md` |
| Parity #2 | shared library takeover and selfdestruct freeze wallet funds | `contracts/parity2/*` | `scripts/04_parity2_freeze.js` | `logs/parity2_freeze.log` |

## 6. Expected results

### 6.1 DAO Reentrancy

Vulnerable ordering:

```solidity
(bool ok, ) = payable(msg.sender).call{value: amount}("");
require(ok, "send failed");
balances[msg.sender] -= amount;
```

Expected vulnerable flow:

1. Victim deposits 10 ETH into `SimpleDAO`.
2. Attacker contract deposits 1 ETH as seed.
3. `DAOAttacker.receive()` recursively calls `withdraw()` before the DAO reduces the recorded balance.
4. DAO balance becomes 0 ETH.
5. Attacker contract balance becomes 11 ETH.

Fix coverage:

- `SimpleDAO_CEI.sol`: balance를 external call 전에 먼저 감소시키는 Checks-Effects-Interactions pattern.
- `SimpleDAO_Guard.sol`: `nonReentrant` guard로 recursive call 차단.
- `SimpleDAO_PullPayment.sol`: 바로 Ether를 push하지 않고 `pendingPayments`에 적립한 뒤 별도 claim으로 받게 함.

### 6.2 Parity #1: Unauthorized Initialization

Expected vulnerable flow:

1. `WalletLibraryVulnerable` 1개 deploy.
2. `WalletVulnerable` proxy wallet 3개 deploy.
3. Wallet 1은 legitimate owner가 `initWallet()`을 정상 호출.
4. Wallet 2, Wallet 3은 초기화되지 않은 상태.
5. Attacker가 wallet proxy fallback을 통해 `initWallet([attacker], 1)` 호출.
6. `delegatecall` 때문에 library code가 proxy storage의 `owners`, `isOwner`를 수정.
7. Attacker가 `execute()`로 Wallet 2, 3 잔액 drain.

Fix:

- `WalletFixed.sol`은 constructor에서 owner를 초기화합니다.
- `initWallet()` 재호출은 `already initialized`로 revert됩니다.
- Attacker의 `execute()`는 `owner only`로 revert됩니다.

### 6.3 Parity #2: Library Self-Destruct

Expected vulnerable flow:

1. `SharedWalletLibraryVulnerable` 1개 deploy.
2. 같은 library를 바라보는 `SharedWallet` 3개 deploy 및 5 ETH씩 funding.
3. Attacker가 library contract 자체에 직접 `initWallet([attacker], 1)` 호출.
4. Attacker가 library own storage의 owner가 됨.
5. Attacker가 `killLibrary()` 호출.
6. Library code가 사라져 proxy wallet들의 delegatecall target이 없어짐.
7. Wallet의 ETH는 attacker에게 전송되지 않고 그대로 남지만, wallet function이 실패하여 frozen 상태가 됨.

Fix:

- `SharedWalletLibraryFixed.sol`은 library instance의 direct initialization을 막습니다.
- `selfdestruct` / `killLibrary()` entrypoint를 제거했습니다.
- Fixed library를 쓰는 wallet은 legitimate owner가 계속 사용할 수 있습니다.

## 7. Why Hardhat uses Merge / Paris

`hardhat.config.js`는 다음 설정을 사용합니다.

- Solidity EVM version: `paris`
- Hardhat simulated network hardfork: `merge`

Modern Cancun / Prague semantics에서는 `SELFDESTRUCT` 동작이 바뀌었기 때문에, Parity #2의 historical replay에서 shared-library code가 사라지고 proxy wallets가 freeze되는 모습을 보여주려면 pre-Cancun behavior가 필요합니다.

## 8. Submission checklist

- [x] DAO vulnerable contract
- [x] DAO attacker contract
- [x] DAO 3 fixed contracts: CEI, guard, pull-over-push
- [x] Parity #1 vulnerable library / proxy wallet
- [x] Parity #1 fixed wallet
- [x] Parity #2 vulnerable shared library / shared wallet
- [x] Parity #2 fixed shared library
- [x] Attack / simulation scripts
- [x] Logs under `logs/`
- [x] Delegatecall storage collision diagram
- [x] Korean report summary: `REPORT_KR.md`
