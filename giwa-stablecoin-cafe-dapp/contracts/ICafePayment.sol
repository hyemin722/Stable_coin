// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICafePayment {
    function pay(address token, uint256 amount) external;

    function addWhitelistedToken(address token) external;
    function removeWhitelistedToken(address token) external;
    function whitelistedTokens(address token) external view returns (bool);

    function setMerchant(address newMerchant) external;
    function merchant() external view returns (address);

    function setFeeRate(uint256 newFeeRate) external;
    function feeRate() external view returns (uint256);
    function FEE_DENOMINATOR() external view returns (uint256);
    function MAX_FEE_RATE() external view returns (uint256);

    function withdrawFees(address token) external;

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
