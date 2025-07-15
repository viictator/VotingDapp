// src/components/MintNFT.tsx (Modified)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { VOTER_NFT_CONTRACT_ADDRESS, Voter_NFT_ABI } from '../constants/contracts';

interface MintNFTProps {
  signer: ethers.Signer;
  userAddress: string;
  onNFTStatusChecked: (hasNFT: boolean) => void; // This prop is crucial
}

export default function MintNFT({ signer, userAddress, onNFTStatusChecked }: MintNFTProps) {
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [hasVotedNFT, setHasVotedNFT] = useState<boolean | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const checkEligibility = useCallback(async () => {
    if (!signer || !userAddress) {
      setHasVotedNFT(null);
      setCheckingEligibility(false);
      onNFTStatusChecked(false); // Call callback immediately if not connected
      return;
    }

    setCheckingEligibility(true);
    setMintError(null);

    try {
      const voterNFTContract = new ethers.Contract(
        VOTER_NFT_CONTRACT_ADDRESS,
        Voter_NFT_ABI,
        signer.provider
      );

      const mintedStatus: boolean = await voterNFTContract.hasMinted(userAddress);
      setHasVotedNFT(mintedStatus);
      onNFTStatusChecked(mintedStatus); // <-- THIS IS THE LINE THAT RELAYS THE STATUS
      console.log(`User ${userAddress} has minted NFT: ${mintedStatus}`); // This is your confirmation log

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
      onNFTStatusChecked(false); // Call callback with false on error
    } finally {
      setCheckingEligibility(false);
    }
  }, [signer, userAddress, onNFTStatusChecked]); // <-- ADD onNFTStatusChecked HERE

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  const handleMint = async () => {
    setMinting(true);
    setMintError(null);
    setMintSuccess(false);

    try {
      const voterNFTContractWithSigner = new ethers.Contract(
        VOTER_NFT_CONTRACT_ADDRESS,
        Voter_NFT_ABI,
        signer
      );

      console.log("Attempting to mint NFT...");
      const tx = await voterNFTContractWithSigner.mint();
      console.log("Transaction sent:", tx.hash);

      await tx.wait();
      setMintSuccess(true);
      console.log("NFT Minted successfully! Transaction confirmed:", tx.hash);

      await checkEligibility(); // This will now correctly trigger onNFTStatusChecked again

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
    <div className="flex flex-col items-center justify-center p-4">
      <p className="text-gray-300 mb-4 text-center">
        Connected Address: {userAddress.substring(0, 6)}...{userAddress.substring(userAddress.length - 4)}
      </p>

      {checkingEligibility ? (
        <p className="text-blue-400">Checking NFT eligibility...</p>
      ) : hasVotedNFT === true ? (
        <p className="text-green-500 text-lg font-semibold">
          You're eligible to vote! (Voter NFT Owned)
        </p>
      ) : (
        <>
          <p className="text-yellow-300 mb-4 text-center">
            You don't own a Voter NFT. Mint one to become eligible.
          </p>
          <button
            onClick={handleMint}
            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
              minting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={minting}
          >
            {minting ? 'Minting NFT...' : 'Mint Your Voter NFT'}
          </button>
        </>
      )}

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