// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title KUSDC
 * @notice Demo K-USDC stablecoin for GIWA Sepolia testnet.
 * @dev Includes ERC-20, owner-managed minters, pause, blacklist, EIP-2612 permit,
 *      and an ERC-3009 style transfer authorization flow.
 */
contract KUSDC is ERC20, ERC20Permit, Ownable, Pausable {
    using ECDSA for bytes32;

    mapping(address => bool) private _minters;
    mapping(address => uint256) private _minterAllowances;
    mapping(address => bool) private _blacklisted;
    mapping(address => mapping(bytes32 => bool)) private _authorizationStates;

    address private _pauser;
    address private _rescuer;

    bytes32 private constant _TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );
    bytes32 private constant _RECEIVE_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );
    bytes32 private constant _CANCEL_AUTHORIZATION_TYPEHASH = keccak256(
        "CancelAuthorization(address authorizer,bytes32 nonce)"
    );
    bytes32 private constant _PERMIT_TYPEHASH = keccak256(
        "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );

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

    modifier onlyMinter() {
        require(_minters[msg.sender], "KUSDC: caller is not minter");
        _;
    }

    modifier onlyPauser() {
        require(msg.sender == _pauser, "KUSDC: caller is not pauser");
        _;
    }

    modifier onlyRescuer() {
        require(msg.sender == _rescuer, "KUSDC: caller is not rescuer");
        _;
    }

    constructor()
        ERC20("My K-USDC", "KUSDC")
        ERC20Permit("My K-USDC")
        Ownable(msg.sender)
    {
        _pauser = msg.sender;
        _rescuer = msg.sender;
        _minters[msg.sender] = true;
        _minterAllowances[msg.sender] = type(uint256).max;

        emit PauserChanged(msg.sender);
        emit RescuerChanged(msg.sender);
        emit MinterConfigured(msg.sender, type(uint256).max);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // ========== Allowance helpers ==========

    function increaseAllowance(address spender, uint256 addedValue) external returns (bool) {
        address tokenOwner = msg.sender;
        _approve(tokenOwner, spender, allowance(tokenOwner, spender) + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool) {
        address tokenOwner = msg.sender;
        uint256 currentAllowance = allowance(tokenOwner, spender);
        require(currentAllowance >= subtractedValue, "KUSDC: decreased allowance below zero");
        unchecked {
            _approve(tokenOwner, spender, currentAllowance - subtractedValue);
        }
        return true;
    }

    // ========== Minter management ==========

    function configureMinter(address minter, uint256 allowance_) external onlyOwner {
        require(minter != address(0), "KUSDC: invalid minter");
        _minters[minter] = true;
        _minterAllowances[minter] = allowance_;
        emit MinterConfigured(minter, allowance_);
    }

    function removeMinter(address minter) external onlyOwner {
        _minters[minter] = false;
        _minterAllowances[minter] = 0;
        emit MinterRemoved(minter);
    }

    function isMinter(address account) external view returns (bool) {
        return _minters[account];
    }

    function minterAllowance(address minter) external view returns (uint256) {
        return _minterAllowances[minter];
    }

    // ========== Mint / burn ==========

    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "KUSDC: invalid receiver");
        require(!_blacklisted[to], "KUSDC: receiver blacklisted");
        require(_minterAllowances[msg.sender] >= amount, "KUSDC: mint allowance exceeded");

        if (_minterAllowances[msg.sender] != type(uint256).max) {
            _minterAllowances[msg.sender] -= amount;
        }

        _mint(to, amount);
        emit Mint(msg.sender, to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Burn(msg.sender, amount);
    }

    // ========== Blacklist ==========

    function blacklist(address account) external onlyOwner {
        require(account != address(0), "KUSDC: invalid account");
        _blacklisted[account] = true;
        emit Blacklisted(account);
    }

    function unBlacklist(address account) external onlyOwner {
        _blacklisted[account] = false;
        emit UnBlacklisted(account);
    }

    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    // ========== Pause ==========

    function pause() external onlyPauser {
        _pause();
    }

    function unpause() external onlyPauser {
        _unpause();
    }

    // ========== Roles ==========

    function updatePauser(address newPauser) external onlyOwner {
        require(newPauser != address(0), "KUSDC: invalid pauser");
        _pauser = newPauser;
        emit PauserChanged(newPauser);
    }

    function updateRescuer(address newRescuer) external onlyOwner {
        require(newRescuer != address(0), "KUSDC: invalid rescuer");
        _rescuer = newRescuer;
        emit RescuerChanged(newRescuer);
    }

    function pauser() external view returns (address) {
        return _pauser;
    }

    function rescuer() external view returns (address) {
        return _rescuer;
    }

    // ========== Rescue ==========

    function rescueERC20(IERC20 token, address to, uint256 amount) external onlyRescuer {
        require(address(token) != address(this), "KUSDC: cannot rescue KUSDC");
        require(to != address(0), "KUSDC: invalid receiver");
        require(token.transfer(to, amount), "KUSDC: rescue failed");
    }

    // ========== ERC-3009 authorization ==========

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
    ) external {
        _requireValidAuthorization(from, validAfter, validBefore, nonce);

        bytes32 structHash = keccak256(
            abi.encode(
                _TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        _requireValidSignature(from, structHash, v, r, s);
        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

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
    ) external {
        require(to == msg.sender, "KUSDC: caller must be payee");
        _requireValidAuthorization(from, validAfter, validBefore, nonce);

        bytes32 structHash = keccak256(
            abi.encode(
                _RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        _requireValidSignature(from, structHash, v, r, s);
        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(!_authorizationStates[authorizer][nonce], "KUSDC: authorization already used");

        bytes32 structHash = keccak256(
            abi.encode(
                _CANCEL_AUTHORIZATION_TYPEHASH,
                authorizer,
                nonce
            )
        );

        _requireValidSignature(authorizer, structHash, v, r, s);
        _authorizationStates[authorizer][nonce] = true;
        emit AuthorizationCanceled(authorizer, nonce);
    }

    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        return _authorizationStates[authorizer][nonce];
    }

    function TRANSFER_WITH_AUTHORIZATION_TYPEHASH() external pure returns (bytes32) {
        return _TRANSFER_WITH_AUTHORIZATION_TYPEHASH;
    }

    function RECEIVE_WITH_AUTHORIZATION_TYPEHASH() external pure returns (bytes32) {
        return _RECEIVE_WITH_AUTHORIZATION_TYPEHASH;
    }

    function CANCEL_AUTHORIZATION_TYPEHASH() external pure returns (bytes32) {
        return _CANCEL_AUTHORIZATION_TYPEHASH;
    }

    function PERMIT_TYPEHASH() external pure returns (bytes32) {
        return _PERMIT_TYPEHASH;
    }

    function _requireValidAuthorization(
        address authorizer,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) internal view {
        require(block.timestamp >= validAfter, "KUSDC: authorization not yet valid");
        require(block.timestamp <= validBefore, "KUSDC: authorization expired");
        require(!_authorizationStates[authorizer][nonce], "KUSDC: authorization already used");
    }

    function _requireValidSignature(
        address expectedSigner,
        bytes32 structHash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view {
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == expectedSigner, "KUSDC: invalid signature");
    }

    // ========== Transfer restrictions ==========

    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        require(!_blacklisted[from], "KUSDC: sender blacklisted");
        require(!_blacklisted[to], "KUSDC: receiver blacklisted");
        super._update(from, to, value);
    }
}
