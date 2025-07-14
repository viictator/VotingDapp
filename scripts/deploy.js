async function main() {
  //Deploy VoterNFT
  const VoterNFT = await ethers.getContractFactory("VoterNFT");
  console.log("Deploying VoterNFT...");
  const voterNFT = await VoterNFT.deploy();
  await voterNFT.deployed();
  console.log("✅ VoterNFT deployed to:", voterNFT.address);

  //Deploy VotingSystem
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  console.log("Deploying VotingSystem...");
  const votingSystem = await VotingSystem.deploy(voterNFT.address);
  await votingSystem.deployed();
  console.log("✅ VotingSystem deployed to:", votingSystem.address);
  


}

// We recommend this pattern to catch errors in async/await
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


  // TO DEPLOY
  //npx hardhat run scripts/deploy.js --network sepolia   