require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SEPOLIA_URL = process.env.SEPOLIA_URL || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  //defaultNetwork: "sepolia",
  networks: {
    sepolia: {
      url: SEPOLIA_URL,
      accounts: PRIVATE_KEY !== "" ? [`0x${PRIVATE_KEY}`] : [],
    },
  },
};
