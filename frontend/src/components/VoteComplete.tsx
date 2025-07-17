// src/components/VoteComplete.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import {
  VOTING_SYSTEM_CONTRACT_ADDRESS,
  Voting_System_ABI,
} from '../constants/contracts';

// IMPORTANT: This MUST match the VOTING_COOLDOWN_PERIOD in your VotingSystem.sol contract.
const VOTING_COOLDOWN_SECONDS = 24 * 60 * 60; // 86400 seconds

interface VoteCompleteProps {
  signer: ethers.Signer;
  userAddress: string;
  voteCooldownEndsAt: number | null; // Passed from parent
  onCooldownExpired: () => Promise<void>; // Callback to notify parent to re-check eligibility
}

export default function VoteComplete({ signer, userAddress, voteCooldownEndsAt, onCooldownExpired }: VoteCompleteProps) {
  const arbitraryQuestion = "Should the dApp introduce a new governance token?";

  const [yesVotes, setYesVotes] = useState<number | null>(null);
  const [noVotes, setNoVotes] = useState<number | null>(null);
  const [displayedTimeRemaining, setDisplayedTimeRemaining] = useState<number | null>(null);

  // Memoize the contract instance
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
      console.log(`VoteComplete: Fetched votes: Yes=${Number(currentYesVotes)}, No=${Number(currentNoVotes)}`);
    } catch (err: unknown) {
      console.error("Error fetching vote counts:", err);
    }
  }, [votingSystemContract]);


  // Effect for initial load and re-syncing vote counts periodically
  useEffect(() => {
    console.log("VoteComplete: Initial vote count fetch and setting up sync interval.");
    fetchVoteCounts(); // Initial fetch

    const voteCountSyncInterval = setInterval(() => {
      console.log("VoteComplete: Re-syncing vote counts...");
      fetchVoteCounts();
    }, 15000); // Sync vote counts every 15 seconds

    // Cleanup for intervals
    return () => clearInterval(voteCountSyncInterval);
  }, [fetchVoteCounts]);


  // Effect for the client-side 1-second countdown
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (voteCooldownEndsAt !== null && voteCooldownEndsAt > Date.now()) {
      // Start the countdown if there's a future end time
      console.log("VoteComplete: Starting client-side countdown interval.");
      // Set initial displayed time immediately to avoid a 1-second delay
      setDisplayedTimeRemaining(Math.max(0, Math.floor((voteCooldownEndsAt - Date.now()) / 1000)));

      intervalId = setInterval(() => {
        const remaining = Math.max(0, Math.floor((voteCooldownEndsAt - Date.now()) / 1000));
        setDisplayedTimeRemaining(remaining);

        if (remaining <= 0) {
          if (intervalId) clearInterval(intervalId);
          intervalId = null;
          console.log("VoteComplete: Client-side countdown reached zero, notifying parent.");
          onCooldownExpired(); // Notify parent to re-check eligibility
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
        console.log("VoteComplete: Cleaning up client-side countdown interval.");
        clearInterval(intervalId);
      }
    };
  }, [voteCooldownEndsAt, onCooldownExpired]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return "0h 0m 0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Calculate vote percentages for the bar
  const currentYesVotes = yesVotes !== null ? yesVotes : 0;
  const currentNoVotes = noVotes !== null ? noVotes : 0;
  const totalVotes = currentYesVotes + currentNoVotes;

  const yesPercentage = totalVotes > 0 ? (currentYesVotes / totalVotes) * 100 : 50;
  const noPercentage = totalVotes > 0 ? (currentNoVotes / totalVotes) * 100 : 50;

  return (
    <div className="flex flex-col items-center justify-center p-4 max-w-3xl mx-auto"> {/* Changed max-w-2xl to max-w-3xl */}
      <h1
        className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-blue-200 to-blue-800 bg-clip-text text-transparent m-0 text-center mb-8 tracking-tighter"
      >
        {arbitraryQuestion}
      </h1>

      {/* New Vote Bar Design */}
      <div className="relative w-full h-16 rounded-lg overflow-hidden bg-gradient-to-r from-blue-200 to-blue-800 flex items-center mt-6 mb-2">
        {/* YES Section (dynamically sized) */}
        <div
          className="h-full flex items-center pl-4 font-bold text-xl"
          style={{ width: `${yesPercentage}%` }}
        >
          {yesVotes !== null && (yesVotes > 0 || (yesVotes === 0 && noVotes === 0)) && <span className="text-white">YES</span>}
        </div>

        {/* NO Section (takes remaining space, text aligned right) */}
        <div
          className="flex-grow h-full flex items-center pr-4 justify-end font-bold text-xl"
        >
          {noVotes !== null && (noVotes > 0 || (yesVotes === 0 && noVotes === 0)) && <span className="text-white">NO</span>}
        </div>

        {/* Separator Line (absolute, positioned based on yesPercentage) */}
        {totalVotes > 0 && yesPercentage > 0 && yesPercentage < 100 && (
          <div
            className="absolute top-0 w-[3px] bg-gray-300 h-full"
            style={{ left: `${yesPercentage}%` }}
          ></div>
        )}
      </div>

      {/* Vote Counts below the bar (aligned with the bar's width) */}
      <div className="flex justify-between w-full px-2">
        <span className="text-blue-500 text-sm">
          {yesVotes !== null ? yesVotes : '0'}
        </span>
        <span className="text-blue-500 text-sm">
          {noVotes !== null ? noVotes : '0'}
        </span>
      </div>

      {/* Cooldown Text */}
      {displayedTimeRemaining !== null && displayedTimeRemaining > 0 ? (
        <p className="text-gray-600 text-md mt-6">
          You can vote again in: {formatTime(displayedTimeRemaining)}
        </p>
      ) : (
        <p className="text-green-600 text-md mt-6">
          Your vote cooldown has expired. You can vote again!
        </p>
      )}
    </div>
  );
}