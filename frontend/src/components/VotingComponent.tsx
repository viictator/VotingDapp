// src/components/VotingComponent.tsx (Adjusted fetchVoteCounts function)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  VOTING_SYSTEM_CONTRACT_ADDRESS,
  Voting_System_ABI,
} from '../constants/contracts';

interface VotingComponentProps {
  signer: ethers.Signer;
  userAddress: string;
}

export default function VotingComponent({ signer, userAddress }: VotingComponentProps) {
  const arbitraryQuestion = "Should the dApp introduce a new governance token?";

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [timeUntilNextVote, setTimeUntilNextVote] = useState<number | null>(null); // In seconds
  const [yesVotes, setYesVotes] = useState<number | null>(null);
  const [noVotes, setNoVotes] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSuccess, setVoteSuccess] = useState(false);

  const votingSystemContract = new ethers.Contract(
    VOTING_SYSTEM_CONTRACT_ADDRESS,
    Voting_System_ABI,
    signer // Use signer for read operations too, as it provides context
  );

  // Function to fetch current vote counts
  const fetchVoteCounts = useCallback(async () => {
    try {
      // **CHANGE THESE LINES:**
      const currentYesVotes = await votingSystemContract.yesVotes(); // Call the public getter for yesVotes
      const currentNoVotes = await votingSystemContract.noVotes();   // Call the public getter for noVotes

      setYesVotes(Number(currentYesVotes)); // Convert BigInt to Number
      setNoVotes(Number(currentNoVotes));   // Convert BigInt to Number
    } catch (err: unknown) {
      console.error("Error fetching vote counts:", err);
      // Handle error, maybe set to null or display a message
    }
  }, [votingSystemContract]); // Dependency: votingSystemContract

  // Function to check user's voting eligibility
  const checkVoteStatus = useCallback(async () => {
    if (!signer || !userAddress) {
      setLoadingStatus(false);
      return;
    }

    setLoadingStatus(true);
    setVoteError(null);
    try {
      const timeRemaining = await votingSystemContract.timeUntilNextVote(userAddress);
      const isEligible = timeRemaining === 0n;

      setHasVotedToday(!isEligible);
      setTimeUntilNextVote(Number(timeRemaining));

      await fetchVoteCounts(); // Also fetch vote counts when checking status

    } catch (err: unknown) {
      console.error("Error checking vote status:", err);
      let errorMessage = 'Failed to check voting status.';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
      }
      setVoteError(errorMessage);
    } finally {
      setLoadingStatus(false);
    }
  }, [signer, userAddress, votingSystemContract, fetchVoteCounts]);

  useEffect(() => {
    checkVoteStatus();

    const interval = setInterval(() => {
      checkVoteStatus();
    }, 15000);

    return () => clearInterval(interval);
  }, [checkVoteStatus]);

  const handleVote = async (voteChoice: boolean) => {
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

      await checkVoteStatus();

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
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  if (loadingStatus) {
    return <p className="text-blue-400 text-center">Loading voting status...</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h3 className="text-2xl font-bold mb-4 text-center">{arbitraryQuestion}</h3>

      {hasVotedToday ? (
        <div className="text-center">
          <p className="text-yellow-400 text-lg">You have already cast your vote for today.</p>
          {timeUntilNextVote !== null && timeUntilNextVote > 0 ? (
            <p className="text-gray-400 text-md mt-2">
              Next vote available in: {formatTime(timeUntilNextVote)}
            </p>
          ) : (
            <p className="text-green-400 text-md mt-2">
                Your vote cooldown has expired. You can vote again!
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-green-400 text-lg mb-4">You are eligible to vote!</p>
          <div className="flex space-x-4">
            <button
              onClick={() => handleVote(true)}
              className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded ${
                voting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={voting}
            >
              {voting ? 'Voting YES...' : 'Vote YES'}
            </button>
            <button
              onClick={() => handleVote(false)}
              className={`bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded ${
                voting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={voting}
            >
              {voting ? 'Voting NO...' : 'Vote NO...'}
            </button>
          </div>
        </>
      )}

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

      {/* Display current vote counts - this can be moved to a separate component later */}
      <div className="mt-8 pt-6 border-t border-gray-700 w-full text-center">
        <h4 className="text-xl font-semibold mb-2">Current Vote Counts:</h4>
        <p className="text-green-400">Yes Votes: {yesVotes !== null ? yesVotes : 'Loading...'}</p>
        <p className="text-red-400">No Votes: {noVotes !== null ? noVotes : 'Loading...'}</p>
      </div>
    </div>
  );
}