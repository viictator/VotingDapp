// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VoterNFT is ERC721, Ownable {
    uint256 public tokenCounter;
    mapping(address => bool) public hasMinted;

    constructor() ERC721("VoterNFT", "VOTE") Ownable(msg.sender) {
        tokenCounter = 1;
    }

    event VoterNFTMinted(address indexed user, uint256 tokenId);

    function mint() external {
        require(!hasMinted[msg.sender], "Already minted NFT");
        hasMinted[msg.sender] = true;
        _safeMint(msg.sender, tokenCounter);
        emit VoterNFTMinted(msg.sender, tokenCounter);
        tokenCounter++;
    }
}
