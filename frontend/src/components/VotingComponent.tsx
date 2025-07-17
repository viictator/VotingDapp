/* // src/components/VotingComponent.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import {
  VOTING_SYSTEM_CONTRACT_ADDRESS,
  Voting_System_ABI,
} from '../constants/contracts';

// IMPORTANT: This MUST match the VOTING_COOLDOWN_PERIOD in your VotingSystem.sol contract.
// Your contract uses "1 days", which is 86400 seconds.
const VOTING_COOLDOWN_SECONDS = 24 * 60 * 60; // 86400 seconds

interface VotingComponentProps {
  signer: ethers.Signer;
  userAddress: string;
}

export default function       VotingComponent({ signer, userAddress }: VotingComponentProps) {
  const arbitraryQuestion = "Should the dApp introduce a new governance token?";

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasVotedToday, setHasVotedToday] = useState(false);

  // This will store the absolute timestamp (in milliseconds) when the cooldown ends
  const [voteCooldownEndsAt, setVoteCooldownEndsAt] = useState<number | null>(null);
  // This is the value displayed, calculated from voteCooldownEndsAt and Date.now()
  const [displayedTimeRemaining, setDisplayedTimeRemaining] = useState<number | null>(null);

  const [yesVotes, setYesVotes] = useState<number | null>(null);
  const [noVotes, setNoVotes] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSuccess, setVoteSuccess] = useState(false);

  // Memoize the contract instance to prevent unnecessary re-creations
  const votingSystemContract = useRef(new ethers.Contract(
    VOTING_SYSTEM_CONTRACT_ADDRESS,
    Voting_System_ABI,
    signer
  )).current;


  // Function to fetch current vote counts from the contract
  const fetchVoteCounts = useCallback(async () => {
    try {
      const currentYesVotes = await votingSystemContract.yesVotes();
      const currentNoVotes = await votingSystemContract.noVotes();
      setYesVotes(Number(currentYesVotes));
      setNoVotes(Number(currentNoVotes));
      console.log(`VotingComponent: Fetched votes: Yes=${Number(currentYesVotes)}, No=${Number(currentNoVotes)}`);
    } catch (err: unknown) {
      console.error("Error fetching vote counts:", err);
    }
  }, [votingSystemContract]);

  // Function to get the last vote time from the contract and calculate cooldown end
  const fetchCooldownEndTime = useCallback(async () => {
    if (!signer || !userAddress) {
      // If no wallet connected, ensure cooldown is reset
      setVoteCooldownEndsAt(null);
      setHasVotedToday(false);
      return;
    }

    setVoteError(null);
    try {
      // **THE CRUCIAL FIX HERE:** Call `lastVoted` which is your public mapping getter
      const lastVoteTimeSecondsBigInt = await votingSystemContract.lastVoted(userAddress);
      const lastVoteTimeSeconds = Number(lastVoteTimeSecondsBigInt); // This is a blockchain timestamp

      let calculatedCooldownEndsAt: number | null = null;
      let userHasRecentlyVoted = false;

      if (lastVoteTimeSeconds === 0) {
        // User has never voted or cooldown is long past
        userHasRecentlyVoted = false;
      } else {
        // Calculate the absolute end time of the cooldown period
        // Convert blockchain seconds to JS milliseconds for comparison with Date.now()
        const cooldownEndTimeBlockchainSeconds = lastVoteTimeSeconds + VOTING_COOLDOWN_SECONDS;
        calculatedCooldownEndsAt = cooldownEndTimeBlockchainSeconds * 1000; // Convert to milliseconds

        // Check if current client time is past the blockchain cooldown end time
        if (Date.now() < calculatedCooldownEndsAt) {
          userHasRecentlyVoted = true; // Still in cooldown
        } else {
          userHasRecentlyVoted = false; // Cooldown expired
          calculatedCooldownEndsAt = 0; // Set to 0 if expired for clarity
        }
      }

      setVoteCooldownEndsAt(calculatedCooldownEndsAt); // Update the state
      setHasVotedToday(userHasRecentlyVoted);
      console.log(`VotingComponent: lastVoted from contract: ${lastVoteTimeSeconds}s, calculated cooldown ends at: ${calculatedCooldownEndsAt}ms`);

    } catch (err: unknown) {
      console.error("Error fetching cooldown end time:", err);
      let errorMessage = 'Failed to fetch voting cooldown status.';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
      }
      setVoteError(errorMessage);
      setVoteCooldownEndsAt(0); // Reset cooldown on error
      setHasVotedToday(false); // Assume not voted or error
    }
  }, [signer, userAddress, votingSystemContract]);

  // Combined function to initialize and refresh all relevant data
  const initializeVotingData = useCallback(async () => {
    setLoadingStatus(true);
    await fetchCooldownEndTime(); // Fetch initial cooldown status
    await fetchVoteCounts();     // Fetch initial vote counts
    setLoadingStatus(false);
  }, [fetchCooldownEndTime, fetchVoteCounts]);


  // Effect for initial load and re-syncing vote counts periodically
  useEffect(() => {
    console.log("VotingComponent: Initial data fetch and setting up vote count sync interval.");
    initializeVotingData(); // Initial comprehensive data fetch on mount

    const voteCountSyncInterval = setInterval(() => {
      console.log("VotingComponent: Re-syncing vote counts...");
      fetchVoteCounts(); // Only fetch vote counts periodically, NOT cooldown time aggressively
    }, 15000); // Sync vote counts every 15 seconds

    // Cleanup for intervals
    return () => clearInterval(voteCountSyncInterval);
  }, [initializeVotingData, fetchVoteCounts]);


  // Effect for the client-side 1-second countdown
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (voteCooldownEndsAt !== null && voteCooldownEndsAt > Date.now()) {
      // Start the countdown if there's a future end time
      console.log("VotingComponent: Starting client-side countdown interval.");
      // Set initial displayed time immediately to avoid a 1-second delay
      setDisplayedTimeRemaining(Math.max(0, Math.floor((voteCooldownEndsAt - Date.now()) / 1000)));

      intervalId = setInterval(() => {
        const remaining = Math.max(0, Math.floor((voteCooldownEndsAt - Date.now()) / 1000));
        setDisplayedTimeRemaining(remaining);

        if (remaining <= 0) {
          if (intervalId) clearInterval(intervalId);
          intervalId = null;
          console.log("VotingComponent: Client-side countdown reached zero, re-fetching cooldown status.");
          fetchCooldownEndTime(); // Re-fetch cooldown from contract to confirm eligibility
        }
      }, 1000); // Decrement every second
    } else {
      // If no cooldown, or it's in the past, ensure displayed time is 0 and no interval runs
      setDisplayedTimeRemaining(0);
      if (intervalId) { // Ensure any existing interval is cleared
          clearInterval(intervalId);
          intervalId = null;
      }
    }

    // Cleanup function: This runs when the component unmounts OR when dependencies change
    return () => {
      if (intervalId) {
        console.log("VotingComponent: Cleaning up client-side countdown interval.");
        clearInterval(intervalId);
      }
    };
  }, [voteCooldownEndsAt, fetchCooldownEndTime]); // Re-run this effect when voteCooldownEndsAt changes


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

      // After a successful vote, immediately re-sync the cooldown and vote counts
      // This will update the vote counts and restart the cooldown timer correctly.
      initializeVotingData();

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

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return "0h 0m 0s";
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
          {displayedTimeRemaining !== null && displayedTimeRemaining > 0 ? (
            <p className="text-gray-400 text-md mt-2">
              Next vote available in: {formatTime(displayedTimeRemaining)}
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

      <div className="mt-8 pt-6 border-t border-gray-700 w-full text-center">
        <h4 className="text-xl font-semibold mb-2">Current Vote Counts:</h4>
        <p className="text-green-400">Yes Votes: {yesVotes !== null ? yesVotes : 'Loading...'}</p>
        <p className="text-red-400">No Votes: {noVotes !== null ? noVotes : 'Loading...'}</p>
      </div>
    </div>
  );
} */