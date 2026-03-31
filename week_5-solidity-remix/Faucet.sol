// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Faucet {
    uint public withdrawAmount = 0.01 ether;

    receive() external payable {}

    function withdraw() public {
        require(address(this).balance >= withdrawAmount, "Not enough balance in faucet");

        (bool success, ) = payable(msg.sender).call{value: withdrawAmount}("");
        require(success, "Transfer failed");
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}