// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Faucet
 * @notice Sepolia 테스트 ETH를 일정량씩 요청할 수 있는 Faucet
 * @dev 과제용: 0.01 ETH 고정 요청, 컨트랙트 잔액 조회, 소유자 입금/전액출금 포함
 */
contract Faucet {
    address payable public owner;
    uint256 public constant REQUEST_AMOUNT = 0.01 ether;
    uint256 public constant LOCK_TIME = 1 days;

    mapping(address => uint256) public lastClaimTime;

    event FundsAdded(address indexed sender, uint256 amount, uint256 newBalance);
    event Claimed(address indexed user, uint256 amount, uint256 newBalance, uint256 timestamp);
    event OwnerWithdrawn(address indexed owner, uint256 amount, uint256 newBalance);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = payable(msg.sender);
    }

    receive() external payable {
        emit FundsAdded(msg.sender, msg.value, address(this).balance);
    }

    function addFunds() external payable {
        require(msg.value > 0, "Send ETH to fund the faucet");
        emit FundsAdded(msg.sender, msg.value, address(this).balance);
    }

    function claim() external {
        require(
            block.timestamp >= lastClaimTime[msg.sender] + LOCK_TIME,
            "You must wait before claiming again"
        );
        require(address(this).balance >= REQUEST_AMOUNT, "Insufficient faucet balance");

        lastClaimTime[msg.sender] = block.timestamp;
        payable(msg.sender).transfer(REQUEST_AMOUNT);

        emit Claimed(msg.sender, REQUEST_AMOUNT, address(this).balance, block.timestamp);
    }

    function ownerWithdrawAll() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No balance to withdraw");

        owner.transfer(amount);
        emit OwnerWithdrawn(owner, amount, address(this).balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getRequestAmount() external pure returns (uint256) {
        return REQUEST_AMOUNT;
    }

    function getNextClaimTime(address user) external view returns (uint256) {
        return lastClaimTime[user] + LOCK_TIME;
    }
}
