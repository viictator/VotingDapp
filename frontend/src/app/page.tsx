// src/app/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import ConnectWallet from '../components/ConnectWallet';
import MintNFT from '../components/MintNFT';
import VotingComponent from '../components/VotingComponent';

// Import the Inter font
import { Inter } from 'next/font/google';

// Initialize the Inter font (with Latin subset for basic characters)
const inter = Inter({ subsets: ['latin'] });


export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userHasNFT, setUserHasNFT] = useState<boolean>(false);

  const handleWalletConnected = useCallback(
    (
      address: string,
      connectedProvider: ethers.BrowserProvider,
      connectedSigner: ethers.Signer
    ) => {
      setAccount(address);
      setSigner(connectedSigner);
      console.log("page.tsx: Wallet connected. Account:", address);
    },
    []
  );

  const handleWalletDisconnected = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setUserHasNFT(false);
    console.log("page.tsx: Wallet disconnected.");
  }, []);

  const handleNFTStatusChecked = useCallback((hasNFT: boolean) => {
    setUserHasNFT(hasNFT);
    console.log("page.tsx: handleNFTStatusChecked called. Setting userHasNFT to:", hasNFT);
  }, []);

  console.log("page.tsx: Current userHasNFT state:", userHasNFT);

  return (
    // Apply the Inter font to the main element
    <main className={`flex min-h-screen flex-col items-center justify-center p-8 bg-[#F9F9F9] text-gray-800 ${inter.className}`}>

      {/* Main Headline Group */}
      <div className="flex flex-col justify-center items-center mb-8"> {/* Adjusted mb-8 here for spacing */}
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-blue-200 to-blue-800 bg-clip-text text-transparent m-0"
          // Reverted gradient direction to 'to right'
          
        >
          VOTING DAPP
        </h1>
        {/* Changed h4 to p for semantic correctness, and added text-lg for better visibility */}
        <p className="m-0 text-lg bg-gradient-to-r from-blue-200 to-blue-800 bg-clip-text text-transparent">ON SEPOLIA NETWORK</p>
      </div>


      {/* Conditional rendering based on wallet connection state */}
      {!account || !signer ? (
        // Page 1: Connect Wallet view
        <div className="w-full max-w-md">
          <ConnectWallet
            onConnect={handleWalletConnected}
            onDisconnect={handleWalletDisconnected}
          />
        </div>
      ) : (
        // Once connected, transition to the next dApp features (Mint NFT, Voting)
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-xl border border-gray-100">
          <h2 className="text-xl font-semibold text-center mb-4">
            DApp Features
          </h2>
          {/* Display connected wallet address (as per Page 2 design detail) */}
          <div className="text-gray-600 text-center mb-4">
            CONNECTED: {account.substring(0, 6)}...{account.substring(account.length - 4)}
          </div>

          <MintNFT
            signer={signer}
            userAddress={account}
            onNFTStatusChecked={handleNFTStatusChecked}
          />

          {userHasNFT && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <VotingComponent signer={signer} userAddress={account} />
            </div>
          )}
        </div>
      )}

      <footer className="mt-12 text-sm text-gray-500">
        Built with Next.js, Hardhat, and Ethers.js
      </footer>
    </main>
  );
}