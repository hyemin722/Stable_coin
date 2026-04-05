// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Counter
 * @notice 가장 기본적인 카운터 컨트랙트
 * @dev 상태 변경, getter, event, require 예제를 포함
 */
contract Counter {
    uint256 private count;

    event CountChanged(address indexed caller, uint256 newCount, string action);

    constructor() {
        count = 0;
    }

    function getCount() public view returns (uint256) {
        return count;
    }

    function increment() public {
        count += 1;
        emit CountChanged(msg.sender, count, "increment");
    }

    function decrement() public {
        require(count > 0, "Count is already 0");
        count -= 1;
        emit CountChanged(msg.sender, count, "decrement");
    }

    function reset() public {
        count = 0;
        emit CountChanged(msg.sender, count, "reset");
    }

    function setCount(uint256 _newCount) public {
        count = _newCount;
        emit CountChanged(msg.sender, count, "setCount");
    }
}
