// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Crowdfunding is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Campaign {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 goalAmount;
        uint256 deadline;
        uint256 totalRaised;
        bool claimed;
        bool cancelled;
    }

    error InvalidUSDCAddress();
    error InvalidGoalAmount();
    error InvalidDuration();
    error EmptyTitle();
    error CampaignNotFound();
    error CampaignCancelledStatus();
    error CampaignExpired();
    error CampaignStillActive();
    error InvalidContributionAmount();
    error NotCampaignCreator();
    error GoalNotMet();
    error GoalAlreadyMet();
    error FundsAlreadyClaimed();
    error CampaignAlreadyCancelled();
    error RefundNotAvailable();
    error NoContribution();
    error ContractIsPaused();

    event CampaignCreated(uint256 indexed id, address indexed creator, uint256 goal, uint256 deadline);
    event Contributed(uint256 indexed id, address indexed contributor, uint256 amount);
    event GoalReached(uint256 indexed id, uint256 totalRaised);
    event FundsWithdrawn(uint256 indexed id, address indexed creator, uint256 amount);
    event RefundClaimed(uint256 indexed id, address indexed contributor, uint256 amount);
    event CampaignCancelled(uint256 indexed id);

    IERC20 public immutable usdcToken;

    mapping(uint256 campaignId => Campaign campaign) public campaigns;
    mapping(uint256 campaignId => mapping(address contributor => uint256 amount)) public contributions;

    uint256 public campaignCount;

    constructor(address _usdcToken, address _owner) Ownable(_owner) {
        if (_usdcToken == address(0)) revert InvalidUSDCAddress();
        usdcToken = IERC20(_usdcToken);
    }

    function createCampaign(
        string calldata title,
        string calldata description,
        uint256 goalAmount,
        uint256 durationInDays
    ) external nonReentrant returns (uint256 campaignId) {
        if (goalAmount == 0) revert InvalidGoalAmount();
        if (durationInDays < 1 || durationInDays > 365) revert InvalidDuration();
        if (bytes(title).length == 0) revert EmptyTitle();

        campaignId = ++campaignCount;
        uint256 deadline = block.timestamp + (durationInDays * 1 days);

        campaigns[campaignId] = Campaign({
            id: campaignId,
            creator: msg.sender,
            title: title,
            description: description,
            goalAmount: goalAmount,
            deadline: deadline,
            totalRaised: 0,
            claimed: false,
            cancelled: false
        });

        emit CampaignCreated(campaignId, msg.sender, goalAmount, deadline);
    }

    function contribute(uint256 campaignId, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidContributionAmount();

        Campaign storage campaign = campaigns[campaignId];
        if (!_campaignExists(campaignId)) revert CampaignNotFound();
        if (campaign.cancelled) revert CampaignCancelledStatus();
        if (block.timestamp > campaign.deadline) revert CampaignExpired();

        uint256 previousRaised = campaign.totalRaised;
        campaign.totalRaised = previousRaised + amount;
        contributions[campaignId][msg.sender] += amount;

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Contributed(campaignId, msg.sender, amount);

        if (previousRaised < campaign.goalAmount && campaign.totalRaised >= campaign.goalAmount) {
            emit GoalReached(campaignId, campaign.totalRaised);
        }
    }

    function withdrawFunds(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (!_campaignExists(campaignId)) revert CampaignNotFound();
        if (msg.sender != campaign.creator) revert NotCampaignCreator();
        if (campaign.cancelled) revert CampaignCancelledStatus();
        if (block.timestamp <= campaign.deadline) revert CampaignStillActive();
        if (campaign.totalRaised < campaign.goalAmount) revert GoalNotMet();
        if (campaign.claimed) revert FundsAlreadyClaimed();

        campaign.claimed = true;
        uint256 amount = campaign.totalRaised;

        usdcToken.safeTransfer(campaign.creator, amount);

        emit FundsWithdrawn(campaignId, campaign.creator, amount);
    }

    function claimRefund(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (!_campaignExists(campaignId)) revert CampaignNotFound();

        bool refundAllowed = campaign.cancelled || (block.timestamp > campaign.deadline && campaign.totalRaised < campaign.goalAmount);
        if (!refundAllowed) revert RefundNotAvailable();

        uint256 amount = contributions[campaignId][msg.sender];
        if (amount == 0) revert NoContribution();

        contributions[campaignId][msg.sender] = 0;

        usdcToken.safeTransfer(msg.sender, amount);

        emit RefundClaimed(campaignId, msg.sender, amount);
    }

    function cancelCampaign(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (!_campaignExists(campaignId)) revert CampaignNotFound();
        if (msg.sender != campaign.creator) revert NotCampaignCreator();
        if (campaign.cancelled) revert CampaignAlreadyCancelled();
        if (block.timestamp > campaign.deadline) revert CampaignExpired();
        if (campaign.totalRaised >= campaign.goalAmount) revert GoalAlreadyMet();

        campaign.cancelled = true;

        emit CampaignCancelled(campaignId);
    }

    function getCampaign(uint256 id) external view returns (Campaign memory) {
        if (!_campaignExists(id)) revert CampaignNotFound();
        return campaigns[id];
    }

    function getContribution(uint256 campaignId, address contributor) external view returns (uint256) {
        if (!_campaignExists(campaignId)) revert CampaignNotFound();
        return contributions[campaignId][contributor];
    }

    function getActiveCampaigns() external view returns (Campaign[] memory activeCampaigns) {
        uint256 activeCount;
        uint256 total = campaignCount;

        for (uint256 i = 1; i <= total; ++i) {
            Campaign storage campaign = campaigns[i];
            if (!campaign.cancelled && campaign.deadline > block.timestamp) {
                ++activeCount;
            }
        }

        activeCampaigns = new Campaign[](activeCount);
        uint256 index;

        for (uint256 i = 1; i <= total; ++i) {
            Campaign storage campaign = campaigns[i];
            if (!campaign.cancelled && campaign.deadline > block.timestamp) {
                activeCampaigns[index] = campaign;
                ++index;
            }
        }
    }

    function getAllCampaigns() external view returns (Campaign[] memory allCampaigns) {
        uint256 total = campaignCount;
        allCampaigns = new Campaign[](total);

        for (uint256 i = 1; i <= total; ++i) {
            allCampaigns[i - 1] = campaigns[i];
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev Prevent permanent lock: owner cannot renounce while paused,
    ///      which would leave contribute() bricked forever.
    function renounceOwnership() public override onlyOwner {
        if (paused()) revert ContractIsPaused();
        super.renounceOwnership();
    }

    function _campaignExists(uint256 campaignId) internal view returns (bool) {
        return campaignId != 0 && campaignId <= campaignCount;
    }
}
