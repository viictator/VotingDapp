async function main() {
  //Deploy VoterNFT
  const VoterNFT = await ethers.getContractFactory("VoterNFT");
  console.log("Deploying VoterNFT...");
  const voterNFT = await VoterNFT.deploy();
  await voterNFT.waitForDeployment();
  console.log("✅ VoterNFT deployed to:", voterNFT.target);

  //Deploy VotingSystem
  const VotingSystem = await ethers.getContractFactory("VotingSystem");
  console.log("Deploying VotingSystem...");
  const votingSystem = await VotingSystem.deploy(voterNFT.target);
  await votingSystem.waitForDeployment();
  console.log("✅ VotingSystem deployed to:", votingSystem.target);
  


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