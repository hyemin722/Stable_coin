// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CounterNumber
 * @notice 사용자가 원하는 숫자만큼 더하고 빼는 카운터 컨트랙트
 * @dev 발표/과제에서 설명하기 좋도록 입력값 검증, event, history를 포함
 */
contract CounterNumber {
    int256 private number;
    address public owner;

    event NumberChanged(address indexed caller, int256 oldValue, int256 newValue, string action);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(int256 _initialValue) {
        owner = msg.sender;
        number = _initialValue;
    }

    function getNumber() public view returns (int256) {
        return number;
    }

    function add(int256 _value) public {
        require(_value > 0, "Input must be greater than 0");
        int256 oldValue = number;
        number += _value;
        emit NumberChanged(msg.sender, oldValue, number, "add");
    }

    function subtract(int256 _value) public {
        require(_value > 0, "Input must be greater than 0");
        int256 oldValue = number;
        number -= _value;
        emit NumberChanged(msg.sender, oldValue, number, "subtract");
    }

    function multiply(int256 _value) public {
        int256 oldValue = number;
        number *= _value;
        emit NumberChanged(msg.sender, oldValue, number, "multiply");
    }

    function divide(int256 _value) public {
        require(_value != 0, "Cannot divide by 0");
        int256 oldValue = number;
        number /= _value;
        emit NumberChanged(msg.sender, oldValue, number, "divide");
    }

    function reset() public onlyOwner {
        int256 oldValue = number;
        number = 0;
        emit NumberChanged(msg.sender, oldValue, number, "reset");
    }

    function setNumber(int256 _newValue) public onlyOwner {
        int256 oldValue = number;
        number = _newValue;
        emit NumberChanged(msg.sender, oldValue, number, "setNumber");
    }

    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }
}
