// src/app/page.tsx (Modified to remove console.log from JSX)
'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import ConnectWallet from '../components/ConnectWallet';
import MintNFT from '../components/MintNFT';
import VotingComponent from '../components/VotingComponent';

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

  // Debug log for the current state of userHasNFT - KEEP THIS ONE, it's outside JSX
  console.log("page.tsx: Current userHasNFT state:", userHasNFT);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <h1 className="text-4xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        Voter dApp
      </h1>

      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
        <ConnectWallet
          onConnect={handleWalletConnected}
          onDisconnect={handleWalletDisconnected}
        />

        {account && signer ? (
          <div className="mt-8 pt-6 border-t border-gray-700">
            <h2 className="text-xl font-semibold text-center mb-4">
              DApp Features
            </h2>
            <MintNFT
              signer={signer}
              userAddress={account}
              onNFTStatusChecked={handleNFTStatusChecked}
            />

            {/* Remove the console.log from here */}
            {/* {console.log("page.tsx: Conditional render check - account:", !!account, "signer:", !!signer, "userHasNFT:", userHasNFT)} */}

            {userHasNFT && (
              <div className="mt-8 pt-6 border-t border-gray-700">
                <VotingComponent signer={signer} userAddress={account} />
              </div>
            )}
          </div>
        ) : (
          <p className="mt-8 text-center text-gray-400">
            Connect your MetaMask wallet to unlock dApp features.
          </p>
        )}
      </div>

      <footer className="mt-12 text-sm text-gray-500">
        Built with Next.js, Hardhat, and Ethers.js
      </footer>
    </main>
  );
}