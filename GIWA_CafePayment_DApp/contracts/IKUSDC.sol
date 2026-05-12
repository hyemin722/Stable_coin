// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IKUSDC
 * @notice K-USDC stablecoin interface used for the GIWA/Nodit cafe payment DApp.
 * @dev ERC-20 + minter allowance + pause + blacklist + permit + ERC-3009 style authorization.
 */
interface IKUSDC {
    // ========== ERC-20 basic ==========
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);

    // ========== increaseAllowance / decreaseAllowance ==========
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);

    // ========== Minter management ==========
    function configureMinter(address minter, uint256 allowance) external;
    function removeMinter(address minter) external;
    function isMinter(address account) external view returns (bool);
    function minterAllowance(address minter) external view returns (uint256);

    // ========== Mint / burn ==========
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;

    // ========== Blacklist ==========
    function blacklist(address account) external;
    function unBlacklist(address account) external;
    function isBlacklisted(address account) external view returns (bool);

    // ========== Pause ==========
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);

    // ========== Role management ==========
    function updatePauser(address newPauser) external;
    function updateRescuer(address newRescuer) external;
    function pauser() external view returns (address);
    function rescuer() external view returns (address);

    // ========== Rescue ==========
    function rescueERC20(IERC20 token, address to, uint256 amount) external;

    // ========== EIP-2612 permit ==========
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function nonces(address owner) external view returns (uint256);

    // ========== ERC-3009 ==========
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool);
    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function TRANSFER_WITH_AUTHORIZATION_TYPEHASH() external view returns (bytes32);
    function RECEIVE_WITH_AUTHORIZATION_TYPEHASH() external view returns (bytes32);
    function CANCEL_AUTHORIZATION_TYPEHASH() external view returns (bytes32);
    function PERMIT_TYPEHASH() external view returns (bytes32);

    // ========== Ownership ==========
    function owner() external view returns (address);
    function transferOwnership(address newOwner) external;
    function renounceOwnership() external;

    // ========== Events ==========
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    event MinterConfigured(address indexed minter, uint256 allowance);
    event MinterRemoved(address indexed minter);

    event Mint(address indexed minter, address indexed to, uint256 amount);
    event Burn(address indexed burner, uint256 amount);

    event Blacklisted(address indexed account);
    event UnBlacklisted(address indexed account);

    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);

    event PauserChanged(address indexed newPauser);
    event RescuerChanged(address indexed newRescuer);
}
