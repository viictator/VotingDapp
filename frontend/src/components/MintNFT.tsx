// src/components/MintNFT.tsx (Modified)
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { VOTER_NFT_CONTRACT_ADDRESS, Voter_NFT_ABI } from '../constants/contracts';

interface MintNFTProps {
  signer: ethers.Signer;
  userAddress: string;
  onNFTStatusChecked: (hasNFT: boolean) => void;
}

export default function MintNFT({ signer, userAddress, onNFTStatusChecked }: MintNFTProps) {
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [hasVotedNFT, setHasVotedNFT] = useState<boolean | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  // Memoize the contract instance for eligibility checks (signer.provider)
  const voterNFTContractRead = useRef(new ethers.Contract(
    VOTER_NFT_CONTRACT_ADDRESS,
    Voter_NFT_ABI,
    signer.provider // Use provider for read-only calls
  )).current;

  // Memoize the contract instance for minting (signer)
  const voterNFTContractWrite = useRef(new ethers.Contract(
    VOTER_NFT_CONTRACT_ADDRESS,
    Voter_NFT_ABI,
    signer // Use signer for state-changing calls
  )).current;


  const checkEligibility = useCallback(async () => {
    if (!signer || !userAddress) {
      setHasVotedNFT(null);
      setCheckingEligibility(false);
      onNFTStatusChecked(false);
      return;
    }

    setCheckingEligibility(true);
    setMintError(null);

    try {
      const mintedStatus: boolean = await voterNFTContractRead.hasMinted(userAddress);
      setHasVotedNFT(mintedStatus);
      onNFTStatusChecked(mintedStatus);
      console.log(`User ${userAddress} has minted NFT: ${mintedStatus}`);

    } catch (err: unknown) {
      console.error("Error checking NFT eligibility:", err);
      let errorMessage = 'Failed to check NFT eligibility.';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
      } else if (typeof err === 'string') {
          errorMessage = err;
      }
      setMintError(errorMessage);
      setHasVotedNFT(null);
      onNFTStatusChecked(false);
    } finally {
      setCheckingEligibility(false);
    }
  }, [signer, userAddress, onNFTStatusChecked, voterNFTContractRead]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  const handleMint = async () => {
    setMinting(true);
    setMintError(null);
    setMintSuccess(false);

    try {
      console.log("Attempting to mint NFT...");
      const tx = await voterNFTContractWrite.mint();
      console.log("Transaction sent:", tx.hash);

      await tx.wait();
      setMintSuccess(true);
      console.log("NFT Minted successfully! Transaction confirmed:", tx.hash);

      await checkEligibility();

    } catch (err: unknown) {
      console.error("Minting error:", err);
      let errorMessage = 'Failed to mint NFT.';
      if (typeof err === 'object' && err !== null) {
          if ('reason' in err && typeof (err as any).reason === 'string') {
              errorMessage = (err as any).reason;
          } else if ('data' in err && typeof (err as any).data === 'object' && (err as any).data !== null && 'message' in (err as any).data) {
              errorMessage = (err as any).data.message;
          } else if ('message' in err && typeof (err as any).message === 'string') {
              errorMessage = (err as any).message;
              if (errorMessage.includes("user rejected transaction")) {
                  errorMessage = "Transaction rejected by user in MetaMask.";
              } else if (errorMessage.includes("Already minted NFT")) {
                  errorMessage = "You have already minted a Voter NFT.";
              }
          }
      } else if (typeof err === 'string') {
          errorMessage = err;
      }
      setMintError(errorMessage);
      setMintSuccess(false);
    } finally {
      setMinting(false);
    }
  };

  return (
    // Added max-w-xl and mx-auto for centering and consistent width
    <div className="flex flex-col items-center justify-center p-4 max-w-xl mx-auto">
      {/* CONNECTED Headline */}
      <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-200 to-blue-800 bg-clip-text text-transparent m-0 text-center mb-2">
        CONNECTED
      </h1>
      {/* User Address */}
      <p className="text-blue-300 text-lg mb-8">
        {userAddress.substring(0, 6)}...{userAddress.substring(userAddress.length - 4)}
      </p>

      {/* Conditional Rendering based on eligibility */}
      {checkingEligibility ? (
        <p className="text-blue-400 text-lg">Checking NFT eligibility...</p>
      ) : hasVotedNFT === false ? (
        // Show minting UI if NFT is NOT owned
        <>
          <button
            onClick={handleMint}
            className={`group relative inline-flex items-center cursor-pointer justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium rounded-lg border-none outline-none shadow-none focus:ring-4 focus:outline-none focus:ring-blue-300 ${
              minting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={minting}
          >
            <span
              className="relative px-10 py-4 transition text-lg uppercase duration-300 ease-in-out bg-gradient-to-r text-white from-blue-200 to-blue-800 rounded-md group-hover:brightness-110 font-bold"
            >
              {minting ? 'Minting NFT...' : 'Mint nft'}
            </span>
          </button>
          {/* New text message below the button */}
          <p className="text-gray-400 text-lg mt-8 text-center">
            Mint the NFT to start using the dApp.
          </p>
        </>
      ) : (
        // If hasVotedNFT is true, render nothing specific from this component
        // The parent component (App.tsx) will handle rendering the next stage of the UI.
        <></>
      )}

      {/* Error and Success Messages */}
      {mintError && (
        <p className="text-red-500 mt-2 text-center break-words max-w-full">
          Error: {mintError}
        </p>
      )}
      {mintSuccess && (
        <p className="text-green-500 mt-2 text-center">
          NFT Minted Successfully!
        </p>
      )}
    </div>
  );
}