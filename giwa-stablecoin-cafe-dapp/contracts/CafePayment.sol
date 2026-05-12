// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CafePayment is Ownable {
    address public merchant;
    uint256 public feeRate;

    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_FEE_RATE = 1000;

    mapping(address => bool) public whitelistedTokens;

    event Paid(
        address indexed payer,
        address indexed token,
        uint256 amount,
        uint256 fee,
        string method,
        uint256 timestamp
    );

    event TokenWhitelisted(address indexed token);
    event TokenRemovedFromWhitelist(address indexed token);
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    event MerchantUpdated(address oldMerchant, address newMerchant);
    event Withdrawn(address indexed token, uint256 amount);

    constructor(address _merchant, uint256 _feeRate) Ownable(msg.sender) {
        require(_merchant != address(0), "invalid merchant");
        require(_feeRate <= MAX_FEE_RATE, "fee too high");

        merchant = _merchant;
        feeRate = _feeRate;
    }

    function addWhitelistedToken(address token) external onlyOwner {
        require(token != address(0), "invalid token");
        whitelistedTokens[token] = true;
        emit TokenWhitelisted(token);
    }

    function removeWhitelistedToken(address token) external onlyOwner {
        whitelistedTokens[token] = false;
        emit TokenRemovedFromWhitelist(token);
    }

    function setMerchant(address newMerchant) external onlyOwner {
        require(newMerchant != address(0), "invalid merchant");

        address oldMerchant = merchant;
        merchant = newMerchant;

        emit MerchantUpdated(oldMerchant, newMerchant);
    }

    function setFeeRate(uint256 newFeeRate) external onlyOwner {
        require(newFeeRate <= MAX_FEE_RATE, "fee too high");

        uint256 oldRate = feeRate;
        feeRate = newFeeRate;

        emit FeeRateUpdated(oldRate, newFeeRate);
    }

    function pay(address token, uint256 amount) external {
        require(whitelistedTokens[token], "token not allowed");
        require(amount > 0, "amount must be positive");

        uint256 fee = (amount * feeRate) / FEE_DENOMINATOR;
        uint256 merchantAmount = amount - fee;

        require(
            IERC20(token).transferFrom(msg.sender, merchant, merchantAmount),
            "merchant transfer failed"
        );

        if (fee > 0) {
            require(
                IERC20(token).transferFrom(msg.sender, address(this), fee),
                "fee transfer failed"
            );
        }

        emit Paid(msg.sender, token, amount, fee, "approve+pay", block.timestamp);
    }

    function withdrawFees(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));

        require(
            IERC20(token).transfer(owner(), balance),
            "withdraw failed"
        );

        emit Withdrawn(token, balance);
    }
}
