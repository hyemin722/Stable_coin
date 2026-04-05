// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Faucet
 * @notice 일정량의 이더를 나눠주는 간단한 Faucet 컨트랙트
 * @dev receive, withdraw, owner-only 출금, 잔액 조회 포함
 */
contract Faucet {
    address payable public owner;
    uint256 public withdrawalAmount = 0.1 ether;

    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed receiver, uint256 amount);
    event WithdrawalAmountChanged(uint256 oldAmount, uint256 newAmount);
    event OwnerWithdrawn(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = payable(msg.sender);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function addFunds() public payable {
        require(msg.value > 0, "Send ETH to fund the faucet");
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 _amount) public {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= withdrawalAmount, "Amount exceeds faucet limit");
        require(address(this).balance >= _amount, "Insufficient faucet balance");

        payable(msg.sender).transfer(_amount);
        emit Withdrawn(msg.sender, _amount);
    }

    function setWithdrawalAmount(uint256 _newAmount) public onlyOwner {
        require(_newAmount > 0, "Amount must be greater than 0");
        uint256 oldAmount = withdrawalAmount;
        withdrawalAmount = _newAmount;
        emit WithdrawalAmountChanged(oldAmount, _newAmount);
    }

    function ownerWithdraw(uint256 _amount) public onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= _amount, "Insufficient balance");

        owner.transfer(_amount);
        emit OwnerWithdrawn(owner, _amount);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
