// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Lab token for Blockchain Lab #7
/// @notice Deploy this token first, then deploy the staking contract with this token address.
contract LabToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("LabToken", "LAB") {
        _mint(msg.sender, initialSupply * 1e18);
    }
}

/// @title Simple ERC-20 staking contract for Blockchain Lab #7
/// @notice Remix-friendly implementation with stake, withdraw, reward, and emergency withdraw.
/// @dev Input amounts are WHOLE TOKENS in Remix.
/// Example: stake(100) means 100 LAB, not 100 wei.
contract SimpleStaking {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    address public owner;

    uint256 public constant TOKEN_UNIT = 1e18;

    // Reward rate is scaled by 1e18.
    // reward = stakedBalance * rewardRatePerSecond * timeElapsed / 1e18
    uint256 public rewardRatePerSecond;

    uint256 public totalStaked; // whole-token units
    uint256 public rewardPool;  // whole-token units available for rewards

    mapping(address => uint256) public stakedBalance;   // whole-token units
    mapping(address => uint256) public pendingReward;   // whole-token units
    mapping(address => uint256) public lastUpdateTime;  // timestamp

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event EmergencyWithdrawn(address indexed user, uint256 amount);
    event RewardFunded(uint256 amount);
    event RewardRateChanged(uint256 newRate);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address _token, uint256 _rewardRatePerSecond) {
        require(_token != address(0), "zero token address");
        owner = msg.sender;
        stakingToken = IERC20(_token);
        rewardRatePerSecond = _rewardRatePerSecond;
    }

    function _updateReward(address account) internal {
        if (lastUpdateTime[account] == 0) {
            lastUpdateTime[account] = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - lastUpdateTime[account];

        if (timeElapsed > 0 && stakedBalance[account] > 0) {
            uint256 newlyEarned =
                (stakedBalance[account] * rewardRatePerSecond * timeElapsed) / 1e18;
            pendingReward[account] += newlyEarned;
        }

        lastUpdateTime[account] = block.timestamp;
    }

    /// @notice Owner deposits reward tokens into the contract.
    /// @param amount Whole-token amount. Example: 5000 means 5000 LAB.
    function fundRewards(uint256 amount) external onlyOwner {
        require(amount > 0, "amount = 0");
        stakingToken.safeTransferFrom(msg.sender, address(this), amount * TOKEN_UNIT);
        rewardPool += amount;
        emit RewardFunded(amount);
    }

    /// @notice Stake tokens into the contract.
    /// @param amount Whole-token amount.
    function stake(uint256 amount) external {
        require(amount > 0, "amount = 0");

        _updateReward(msg.sender);

        // Contract pulls tokens from the user after approval.
        stakingToken.safeTransferFrom(msg.sender, address(this), amount * TOKEN_UNIT);

        stakedBalance[msg.sender] += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /// @notice Withdraw staked principal.
    /// @param amount Whole-token amount.
    function withdraw(uint256 amount) external {
        require(amount > 0, "amount = 0");
        require(stakedBalance[msg.sender] >= amount, "not enough staked");

        _updateReward(msg.sender);

        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;

        stakingToken.safeTransfer(msg.sender, amount * TOKEN_UNIT);

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Claim accumulated rewards.
    function claimReward() external {
        _updateReward(msg.sender);

        uint256 reward = pendingReward[msg.sender];
        require(reward > 0, "no reward");
        require(rewardPool >= reward, "insufficient reward pool");

        pendingReward[msg.sender] = 0;
        rewardPool -= reward;

        stakingToken.safeTransfer(msg.sender, reward * TOKEN_UNIT);

        emit RewardClaimed(msg.sender, reward);
    }

    /// @notice Emergency withdrawal of principal only. Pending reward is discarded.
    function emergencyWithdraw() external {
        uint256 amount = stakedBalance[msg.sender];
        require(amount > 0, "nothing staked");

        stakedBalance[msg.sender] = 0;
        pendingReward[msg.sender] = 0;
        lastUpdateTime[msg.sender] = block.timestamp;
        totalStaked -= amount;

        stakingToken.safeTransfer(msg.sender, amount * TOKEN_UNIT);

        emit EmergencyWithdrawn(msg.sender, amount);
    }

    /// @notice View current earned reward including live accrued reward.
    function earned(address account) public view returns (uint256) {
        if (lastUpdateTime[account] == 0) {
            return pendingReward[account];
        }

        uint256 timeElapsed = block.timestamp - lastUpdateTime[account];
        uint256 liveReward =
            (stakedBalance[account] * rewardRatePerSecond * timeElapsed) / 1e18;

        return pendingReward[account] + liveReward;
    }

    function getMyStakedBalance() external view returns (uint256) {
        return stakedBalance[msg.sender];
    }

    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRatePerSecond = newRate;
        emit RewardRateChanged(newRate);
    }
}
