# Blockchain Lab #7 - ERC-20 & Staking Contract

본 저장소는 국민대학교 Blockchain Lab #7 제출용 저장소입니다.

본 저장소의 Solidity 파일 `Lab7_Staking.sol`에는 ERC-20 토큰 컨트랙트(`LabToken`)와 스테이킹 컨트랙트(`SimpleStaking`)가 함께 포함되어 있습니다.

## 1. Overview
This project implements and deploys an ERC-20 token contract (`LabToken`) and a staking contract (`SimpleStaking`) on the **Sepolia testnet** using **Remix IDE** and **MetaMask**.

After deployment, staking and withdrawal transactions were successfully executed and verified.

## 2. Environment
- Remix IDE
- MetaMask
- Sepolia Testnet
- OpenZeppelin Contracts
- Solidity `^0.8.20`

## 3. Contracts
### 3.1 LabToken
- ERC-20 token based on OpenZeppelin
- Initial supply is minted to the deployer

### 3.2 SimpleStaking
- `stake(uint256 amount)` : deposit tokens into the staking contract
- `withdraw(uint256 amount)` : withdraw staked tokens
- `getMyStakedBalance()` : check personal staked balance
- `fundRewards(uint256 amount)` : deposit reward tokens into the contract
- `earned(address account)` : check accumulated rewards
- `claimReward()` : claim rewards
- `emergencyWithdraw()` : emergency withdrawal

## 4. Execution Flow
1. Deploy `LabToken`
2. Deploy `SimpleStaking`
3. Execute `approve()` from `LabToken`
4. Execute `fundRewards(5000)`
5. Execute `stake(100)`
6. Execute `withdraw(50)`
7. Verify the transactions on a blockchain explorer

## 5. Transaction Hashes
- **SimpleStaking deployment tx hash**  
  `0x03eda366a1f591aad4b302fb936d3cadcdfe267a281ff0a2c42a7200d9139211`

- **Stake tx hash**  
  `0x49e031d8ef79924f9a257ef480a683747f0a23c39fef6d471b6b651a9474d767`

- **Withdrawal tx hash**  
  `0x6c9ad7f7f2f25b10112b1eba63f8767fdd79ad138bd9467ff6a32be905c1248e`

## 6. Completion
The required lab tasks were completed on the Sepolia testnet:
- Contract deployment
- Stake transaction
- Withdrawal transaction
