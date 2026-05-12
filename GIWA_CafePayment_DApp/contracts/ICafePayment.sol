// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ICafePayment
 * @notice Cafe payment contract interface.
 * @dev Method A: approve + pay. Method B: payWithAuthorization using ERC-3009 style authorization.
 */
interface ICafePayment {
    // ========== Payment ==========
    function pay(address token, uint256 amount) external;

    function payWithAuthorization(
        address token,
        uint256 amount,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    // ========== Whitelist ==========
    function addWhitelistedToken(address token) external;
    function removeWhitelistedToken(address token) external;
    function whitelistedTokens(address token) external view returns (bool);

    // ========== Merchant ==========
    function setMerchant(address newMerchant) external;
    function merchant() external view returns (address);

    // ========== Fee ==========
    function setFeeRate(uint256 newFeeRate) external;
    function feeRate() external view returns (uint256);
    function FEE_DENOMINATOR() external view returns (uint256);
    function MAX_FEE_RATE() external view returns (uint256);

    // ========== Withdraw ==========
    function withdrawFees(address token) external;

    // ========== Ownership ==========
    function owner() external view returns (address);
    function transferOwnership(address newOwner) external;
    function renounceOwnership() external;

    // ========== Events ==========
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
}
