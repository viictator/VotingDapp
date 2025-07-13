async function main() {
  // Get the ContractFactory for your smart contract (replace 'VoterNFT' later)
  const VoterNFT = await ethers.getContractFactory("VoterNFT");

  // Deploy the contract
  console.log("Deploying VoterNFT...");
  const voterNFT = await VoterNFT.deploy();

  // Wait for deployment to finish
  await voterNFT.deployed();
  

  console.log("✅ VoterNFT deployed to:", voterNFT.address);
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