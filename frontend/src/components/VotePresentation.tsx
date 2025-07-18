// src/components/VotePresentation.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import {
  VOTING_SYSTEM_CONTRACT_ADDRESS,
  Voting_System_ABI,
} from '../constants/contracts';

interface VotePresentationProps {
  signer: ethers.Signer;
  userAddress: string;
  onVoteCast: () => Promise<void>; // Callback to notify parent (page.tsx) to refresh state
}

export default function VotePresentation({ signer, userAddress, onVoteCast }: VotePresentationProps) {
  const arbitraryQuestion = "Should the dApp introduce a new governance token?";

  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSuccess, setVoteSuccess] = useState(false);

  // Memoize the contract instance
  const votingSystemContract = useRef(new ethers.Contract(
    VOTING_SYSTEM_CONTRACT_ADDRESS,
    Voting_System_ABI,
    signer
  )).current;

  const handleVote = useCallback(async (voteChoice: boolean) => {
    setVoting(true);
    setVoteError(null);
    setVoteSuccess(false);

    try {
      console.log(`Casting vote: ${voteChoice ? 'YES' : 'NO'} for ${userAddress}`);
      const tx = await votingSystemContract.vote(voteChoice);
      console.log("Vote transaction sent:", tx.hash);

      await tx.wait();
      setVoteSuccess(true);
      console.log("Vote cast successfully! Transaction confirmed:", tx.hash);

      // Notify parent component that a vote was cast, so it can re-fetch cooldown status
      await onVoteCast();

    } catch (err: unknown) {
      console.error("Voting error:", err);
      let errorMessage = 'Failed to cast vote.';
      if (typeof err === 'object' && err !== null) {
          if ('reason' in err && typeof (err as any).reason === 'string') {
              errorMessage = (err as any).reason;
          } else if ('data' in err && typeof (err as any).data === 'object' && (err as any).data !== null && 'message' in (err as any).data) {
              errorMessage = (err as any).data.message;
          } else if ('message' in err && typeof (err as any).message === 'string') {
              errorMessage = (err as any).message;
              if (errorMessage.includes("user rejected transaction")) {
                  errorMessage = "Transaction rejected by user in MetaMask.";
              } else if (errorMessage.includes("You must own a VoterNFT to vote")) {
                  errorMessage = "You must own a VoterNFT to vote. (Should not happen if reached here)";
              } else if (errorMessage.includes("You can only vote once every 24 hours")) {
                  errorMessage = "You can only vote once every 24 hours.";
              }
          }
      } else if (typeof err === 'string') {
          errorMessage = err;
      }
      setVoteError(errorMessage);
      setVoteSuccess(false);
    } finally {
      setVoting(false);
    }
  }, [onVoteCast, userAddress, votingSystemContract]);

  // Common base classes for the outer <button> element
  const baseButtonClasses = `group relative inline-flex items-center justify-center p-0.5 overflow-hidden text-lg font-medium rounded-lg border-none outline-none shadow-none focus:ring-4 focus:outline-none cursor-pointer`;

  // Common inner <span> classes for the gradient effect
  const baseSpanClasses1 = `relative px-12 py-4 transition duration-300 ease-in-out bg-gradient-to-r text-white from-blue-300 to-blue-500 rounded-md group-hover:brightness-110 font-bold`;
  const baseSpanClasses2 = `relative px-12 py-4 transition duration-300 ease-in-out bg-gradient-to-r text-white from-blue-500 to-blue-700 rounded-md group-hover:brightness-110 font-bold`;


  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="flex flex-col justify-center items-center mb-8">
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-blue-200 to-blue-800 bg-clip-text text-transparent m-0 text-center"
        >
          {arbitraryQuestion}
        </h1>
      </div>
      
      {/* Removed the green "You are eligible to vote!" text */}
      
      <div className="flex space-x-8">
        {/* YES Button */}
        <button
          onClick={() => handleVote(true)}
          className={`${baseButtonClasses} focus:ring-blue-300 ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={voting}
        >
          <span
            className={baseSpanClasses1}
          >
            YES
          </span>
        </button>

        {/* Vertical Separator Line */}
        <div className="w-px bg-gray-300 h-10 self-center"></div>

        {/* NO Button */}
        <button
          onClick={() => handleVote(false)}
          className={`${baseButtonClasses} focus:ring-blue-300 ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={voting}
        >
          <span
            className={baseSpanClasses2}
          >
            NO
          </span>
        </button>
      </div>

      {voteError && (
        <p className="text-red-500 mt-4 text-center break-words max-w-full">
          Error: {voteError}
        </p>
      )}
      {voteSuccess && (
        <p className="text-green-500 mt-4 text-center">
          Your vote has been cast successfully!
        </p>
      )}
    </div>
  );
}