Week 6 Faucet Project

Project Overview
This project implements a Sepolia Faucet smart contract and a simple web page that interacts with the deployed contract through MetaMask.

Files
1. Faucet.sol
   - Solidity smart contract for the faucet
   - Supports fixed 0.01 ETH claim
   - Includes claim lock time and faucet balance check

2. faucet-config.js
   - Stores deployed contract address
   - Stores ABI used by the frontend

3. faucet.html
   - Frontend web page for MetaMask interaction
   - Displays wallet address, network, contract address, faucet balance, request amount, next claim time
   - Supports claim transaction and shows transaction hash link
   - Includes faucet balance chart

Implemented Features
- Connect MetaMask wallet
- Display connected wallet address
- Display current network
- Display deployed contract address
- Display faucet balance in ETH
- Display fixed request amount (0.01 ETH)
- Claim 0.01 ETH from the faucet
- Display next claim time
- Display transaction hash after claim with clickable Sepolia Etherscan link
- Show faucet balance chart over time

Deployed Network
- Ethereum Sepolia Testnet

Contract Address
- 0xb53825fc56615315229b660891a2bd1906861c73

How to Run
1. Put Faucet.sol, faucet-config.js, and faucet.html in the same folder.
2. Open the folder in VS Code.
3. Run faucet.html using Live Server.
4. Connect MetaMask.
5. Make sure MetaMask is switched to Sepolia.
6. Interact with the faucet through the web page.

Notes
- Do not open faucet.html with file:///.
- Use VS Code Live Server for proper execution.
- If no contract code is found, switch MetaMask to the same network where the contract was deployed.
- Repeated claim attempts before the lock time will fail by design.

Expected Result
- Wallet connects successfully
- Faucet information is displayed
- Claim transaction can be submitted through MetaMask
- Transaction hash is shown as a clickable Sepolia Etherscan link
- Faucet balance chart is displayed