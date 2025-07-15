const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem", function () {
    let voterNFT, votingSystem, owner, user1, user2;

    beforeEach(async () => {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy a mock VoterNFT contract
        const VoterNFT = await ethers.getContractFactory("VoterNFT");
        voterNFT = await VoterNFT.deploy();
        await voterNFT.waitForDeployment();

        // Mint VoterNFT to user1 to simulate ownership
        await voterNFT.connect(user1).mint();


        // Deploy VotingSystem, passing in VoterNFT address
        const VotingSystem = await ethers.getContractFactory("VotingSystem");
        votingSystem = await VotingSystem.deploy(voterNFT.target);
        await votingSystem.waitForDeployment();
    });

    it("Should set the VoterNFT address correctly", async () => {
        expect(await votingSystem.voterNFT()).to.equal(voterNFT.target);

    });

    it("Should NOT allow voting if user doesn't own VoterNFT", async () => {
        await expect(votingSystem.connect(user2).vote(true)).to.be.revertedWith("You must own a VoterNFT to vote");
    });

    it("Should allow user to vote YES if they own VoterNFT and emit event", async () => {
        await expect(votingSystem.connect(user1).vote(true))
        .to.emit(votingSystem, "Voted")
        .withArgs(user1.address, true, anyValue);

        expect(await votingSystem.yesVotes()).to.be.equal(1);
        expect(await votingSystem.noVotes()).to.be.equal(0);
    });



    it("Should not allow voting twice within the same 24 hours", async () => {
        await votingSystem.connect(user1).vote(true);

        await expect(votingSystem.connect(user1).vote(false)).to.be.revertedWith("You can only vote once every 24 hours")
    });

    it("Should allow voting again after 24 hours", async () => {
        await votingSystem.connect(user1).vote(true);

        //increase time by 1 day + 1 second
        await ethers.provider.send("evm_increaseTime", [86401]);
        await ethers.provider.send("evm_mine");

        await votingSystem.connect(user1).vote(false);
        expect(await votingSystem.yesVotes()).to.equal(1);
        expect(await votingSystem.noVotes()).to.equal(1);


    })
})