# Week 12 Smart Contract Security Lab 결과 보고서 요약

## 1. 실습 목적

본 실습은 Ethereum smart contract에서 역사적으로 문제가 되었던 세 가지 취약점, 즉 DAO Reentrancy, Parity Wallet Unauthorized Initialization, Parity Library Self-Destruct를 로컬 Hardhat 환경에서 재현하고 수정 방법을 확인하는 것을 목적으로 한다. 모든 실험은 local in-memory network에서만 수행되며 실제 네트워크, 실제 개인키, 실제 자금은 사용하지 않는다.

## 2. Part 1 — DAO Hack: Reentrancy

### 취약점 원리

`SimpleDAO.withdraw()`는 사용자의 기록된 잔액을 감소시키기 전에 먼저 `msg.sender.call{value: amount}("")`로 ETH를 전송한다. 이때 수신자가 contract이면 `receive()` 함수가 실행될 수 있고, 이 함수 안에서 다시 `withdraw()`를 호출할 수 있다. 아직 `balances[msg.sender]`가 감소하지 않았기 때문에 동일한 잔액 검사를 반복해서 통과하고 DAO 잔액을 계속 인출할 수 있다.

### 공격 결과

- Victim이 10 ETH를 DAO에 deposit한다.
- Attacker contract가 1 ETH를 seed로 deposit한다.
- Attacker contract의 `receive()`가 재귀적으로 `withdraw()`를 호출한다.
- 최종적으로 DAO balance는 0 ETH가 되고 attacker contract balance는 11 ETH가 된다.

### 수정 방법

1. **Checks-Effects-Interactions**  
   외부 호출 전에 내부 상태인 balance를 먼저 감소시킨다.

2. **Reentrancy Guard**  
   `locked` 변수를 사용하여 하나의 `withdraw()` 실행 중 재진입을 차단한다.

3. **Pull-over-push**  
   `withdraw()` 시 ETH를 즉시 전송하지 않고 `pendingPayments`에 기록한 뒤, 사용자가 별도의 `claimPayment()`로 수령하게 한다. 이 방식은 첫 `withdraw()` 중 callback이 발생하지 않기 때문에 재진입 경로가 줄어든다.

## 3. Part 2 — Parity Hack #1: Unauthorized Initialization

### 취약점 원리

`WalletVulnerable`은 실제 로직을 직접 갖고 있지 않고 fallback에서 `walletLibrary.delegatecall(msg.data)`를 수행한다. `delegatecall`은 library code를 실행하지만 storage는 caller인 proxy wallet의 storage를 사용한다. 따라서 초기화되지 않은 proxy wallet에 attacker가 `initWallet([attacker], 1)`을 호출하면, library의 `initWallet()` 코드가 proxy wallet의 owner storage를 attacker로 바꿔버린다.

### 공격 결과

- Wallet 1은 legitimate owner가 정상적으로 초기화한다.
- Wallet 2와 Wallet 3은 초기화되지 않은 상태로 둔다.
- Attacker가 Wallet 2, Wallet 3에 `initWallet([attacker], 1)`을 호출한다.
- Attacker가 각 wallet의 owner가 된다.
- Attacker가 `execute()`로 Wallet 2와 Wallet 3의 잔액을 drain한다.

### 수정 방법

`WalletFixed`는 constructor에서 owner를 초기화하고, `initialized` 변수를 사용해 `initWallet()` 재호출을 막는다. 따라서 attacker가 다시 초기화하려 하면 `already initialized`로 revert되고, owner가 아니므로 `execute()`도 실패한다.

## 4. Part 3 — Parity Hack #2: Library Self-Destruct

### 취약점 원리

여러 proxy wallet이 하나의 shared library address를 바라보는 구조에서, library contract 자체가 uninitialized 상태이고 public `killLibrary()`를 갖고 있으면 문제가 된다. Attacker가 library contract 자체에 직접 `initWallet()`을 호출하여 library own storage의 owner가 된 뒤, `killLibrary()`로 library code를 제거할 수 있다. 그러면 proxy wallet들은 여전히 ETH를 보유하지만, fallback에서 delegatecall할 code가 사라졌기 때문에 wallet function을 실행할 수 없다.

### 실습 결과

- Shared library 1개와 같은 library를 바라보는 wallet 3개를 deploy한다.
- 각 wallet에 5 ETH를 넣고 legitimate owner로 초기화한다.
- Attacker가 library 자체의 owner가 된다.
- Attacker가 `killLibrary()`를 호출한다.
- 이후 각 wallet에서 `execute()`를 시도하면 `library code missing: wallet funds frozen`으로 실패한다.
- Wallet balance는 그대로 5 ETH씩 남아 있다.

중요한 점은 이 실습에서 attacker가 wallet의 ETH를 훔친 것이 아니라, wallet들이 library code를 잃어서 자금을 사용할 수 없는 frozen 상태가 되었다는 것이다.

### 수정 방법

`SharedWalletLibraryFixed`는 constructor에서 library instance의 `initialized`를 true로 설정하여 direct initialization을 막는다. 또한 `selfdestruct` 또는 `killLibrary()` 같은 entrypoint를 제공하지 않는다. 따라서 attacker가 library를 takeover하거나 제거할 수 없고, wallet은 legitimate owner가 계속 사용할 수 있다.

## 5. Delegatecall storage collision 설명

`delegatecall`은 호출된 library의 code를 실행하지만 storage는 library가 아니라 호출한 proxy contract의 storage를 사용한다. 따라서 proxy와 library의 state variable 순서가 맞지 않으면 의도하지 않은 slot이 수정될 수 있다. 본 실습에서는 다음 layout을 의도적으로 맞춰서 Parity 스타일 취약점을 보여준다.

| Slot | Variable | Meaning |
|---:|---|---|
| 0 | `walletLibrary` | delegatecall target address |
| 1 | `owners` | owner dynamic array length |
| 2 | `isOwner` | owner mapping root |
| 3 | `required` | required signature threshold |
| 4 | `initialized` | Parity #2 fixed model에서 initialization guard |

## 6. 결론

DAO 사례는 외부 호출 전 상태 변경이 왜 중요한지 보여준다. Parity #1은 proxy와 library 구조에서 initialization guard가 없을 때 owner takeover가 가능함을 보여준다. Parity #2는 shared library에 대한 access control과 `selfdestruct` 제거가 왜 중요한지 보여주며, 특히 이 경우는 theft가 아니라 funds freeze라는 점이 핵심이다.


## 8. 실행 검증

본 패키지는 `npm ci` 후 `npm test`로 검증했다. `npm test`는 local solc-js compile을 수행한 뒤 DAO 공격, DAO 수정안, Parity #1, Parity #2 시뮬레이션을 순서대로 실행하고 `logs/` 아래 4개 결과 파일을 다시 생성한다.
