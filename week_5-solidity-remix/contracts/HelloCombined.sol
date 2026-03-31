// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract HelloCombined {
    string private _greeting = "Hello, World!";
    int private number = 10;

    function greet() public view returns (string memory) {
        return _greeting;
    }

    function getNumber() public view returns (int) {
        return number;
    }

    function setGreeting(string memory newGreeting) public {
        _greeting = newGreeting;
    }

    function setNumber(int newNumber) public {
        number = newNumber;
    }
}