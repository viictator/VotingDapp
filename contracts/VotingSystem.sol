// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract VotingSystem is Ownable {
    IERC721 public voterNFT;

    mapping(address => uint256) public lastVoted;
    mapping(uint256 => uint256) public votesPerDay; // Unix date => total votes that day

    uint256 public yesVotes;
    uint256 public noVotes;

    event Voted(address indexed voter, bool vote, uint256 timestamp);

    constructor(address _voterNFT) Ownable(msg.sender) {
        voterNFT = IERC721(_voterNFT);
    }

    function vote(bool _voteYes) external {
        require(voterNFT.balanceOf(msg.sender) > 0, "You must own a VoterNFT to vote.");

        // Enforce 24-hour delay
        require(
            block.timestamp > lastVoted[msg.sender] + 1 days,
            "You can only vote once every 24 hours."
        );

        lastVoted[msg.sender] = block.timestamp;

        if (_voteYes) {
            yesVotes += 1;
        } else {
            noVotes += 1;
        }

        // Store votes per day (optional tracking)
        uint256 day = block.timestamp / 1 days;
        votesPerDay[day] += 1;

        emit Voted(msg.sender, _voteYes, block.timestamp);
    }

    function leadingVote() public view returns (string memory) {
        if (yesVotes > noVotes) return "YES";
        if (noVotes > yesVotes) return "NO";
        return "TIED";
    }

    function timeUntilNextVote(address user) public view returns (uint256) {
        if (block.timestamp > lastVoted[user] + 1 days) return 0;
        return (lastVoted[user] + 1 days) - block.timestamp;
    }
}
