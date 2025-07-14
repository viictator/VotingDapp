# 🗳️ Voting DApp with Voter NFTs

This project is a decentralized voting system built with **Solidity**, **React**, and **Hardhat**. It allows users to mint a unique "Voter NFT", vote once per day, and receive a proof-of-vote NFT or token in return.

## 📚 Why this project?

I'm currently learning **Solidity** and **smart contract development**, and this is my hands-on way to apply everything I'm learning. The goal is to understand how NFTs, voting logic, smart contract restrictions, and frontend integration work in a real-world decentralized application.

---

## 🚀 Features

- ✅ **Mint a Voter NFT** – Each wallet can mint **only one** Voter NFT.
- ✅ **Vote once per day** – Only Voter NFT holders can vote, and they can do so once every 24 hours.
- ✅ **Earn a Vote Stamp** – After voting, users receive a "stamp" as proof of participation.
- ✅ **Voting Status** – See who's winning ("Yes", "No", or "Tied") in real time.
- ✅ **Frontend Integration** – Connect MetaMask and interact with the contract directly via a clean UI.
- ✅ **Tests written in Hardhat** – Smart contracts are tested using modern tooling.

---

## 🔧 Tech Stack

| Part         | Tech                            |
|--------------|---------------------------------|
| Frontend     | React + Vite + TypeScript       |
| Wallet       | MetaMask                        |
| Web3 Library | Ethers.js                       |
| Contracts    | Solidity + Hardhat + OpenZeppelin |
| NFT Storage  | NFT.Storage / IPFS (optional)   |

---

## 🧩 Smart Contracts Overview

### VoterNFT.sol
- Based on ERC-721
- Each wallet can only mint **one** NFT

### VotingSystem.sol
- Allows voting only if user holds a Voter NFT
- Enforces **1 vote per 24 hours**
- Emits events on voting
- Tracks vote counts and provides leader information
- Can reward users with a "vote stamp" NFT (optional)

---

## 📦 To Run Locally

1. Clone the repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/voting-dapp.git
   cd voting-dapp
