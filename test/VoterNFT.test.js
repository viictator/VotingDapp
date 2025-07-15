const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("VoterNFT", function () {
    let voterNFT;
    let owner;
    let addr1;
    
    beforeEach(async function () {
    const VoterNFT = await ethers.getContractFactory("VoterNFT");
    [owner, addr1] = await ethers.getSigners();
    voterNFT = await VoterNFT.deploy();
    
});




    it("Should start with tokenCounter at 1", async function () {
        expect(await voterNFT.tokenCounter()).to.equal(1);
    });

    it("Should mint NFT and increment tokenCounter", async function() {
        await voterNFT.connect(addr1).mint();

        //now addr1 should own token ID 1
        expect(await voterNFT.ownerOf(1)).to.equal(addr1.address);
        expect(await voterNFT.tokenCounter()).to.equal(2);

    });

    it("should prevent address from minting more than once", async function() {
        await voterNFT.connect(addr1).mint();

        await expect(voterNFT.connect(addr1).mint()).to.be.revertedWith("Already minted NFT");
    });

})
