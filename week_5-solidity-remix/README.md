# Week 5 - Solidity & Remix I

이름: 유혜민  
학번: 20235143  

## 실습 내용
이번 실습에서는 Remix를 이용하여 Solidity 스마트 컨트랙트를 작성하고 배포했습니다.

### 1. HelloCombined.sol
- HelloWorld와 HelloNumber 내용을 하나의 컨트랙트로 합쳤습니다.
- greeting과 number 상태 변수를 함께 확인할 수 있도록 구성했습니다.
- number를 private으로 두고, getNumber() 함수로 외부에서 값을 읽을 수 있게 했습니다.
- setGreeting(), setNumber()를 통해 상태 변경을 확인했습니다.

### 2. Faucet.sol
- Faucet 형태의 스마트 컨트랙트를 작성했습니다.
- 컨트랙트가 ETH를 받을 수 있도록 receive()를 사용했습니다.
- getBalance()로 잔액을 확인하고, withdraw()로 일정량의 ETH를 출금하도록 만들었습니다.
- Remix VM 환경에서 배포 후 동작을 테스트했습니다.