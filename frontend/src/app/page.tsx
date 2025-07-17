// src/app/page.tsx
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import ConnectWallet from '../components/ConnectWallet';
import MintNFT from '../components/MintNFT';
import VotePresentation from '../components/VotePresentation';
import VoteComplete from '../components/VoteComplete';

import { Inter } from 'next/font/google';
import { VOTING_SYSTEM_CONTRACT_ADDRESS, Voting_System_ABI } from '@/constants/contracts';

const inter = Inter({ subsets: ['latin'] });

const VOTING_COOLDOWN_SECONDS = 24 * 60 * 60; // 86400 seconds

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userHasNFT, setUserHasNFT] = useState<boolean>(false);

  const [loadingVotingStatus, setLoadingVotingStatus] = useState(true);
  const [hasVotedToday, setHasVotedToday] = useState(false);
  const [voteCooldownEndsAt, setVoteCooldownEndsAt] = useState<number | null>(null);
  const [votingError, setVotingError] = useState<string | null>(null);

  const votingSystemContractRef = useRef<ethers.Contract | null>(null);

  useEffect(() => {
    if (signer) {
      votingSystemContractRef.current = new ethers.Contract(
        VOTING_SYSTEM_CONTRACT_ADDRESS,
        Voting_System_ABI,
        signer
      );
    } else {
      votingSystemContractRef.current = null;
    }
  }, [signer]);

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
    setLoadingVotingStatus(true);
    setHasVotedToday(false);
    setVoteCooldownEndsAt(null);
    setVotingError(null);
    console.log("page.tsx: Wallet disconnected.");
  }, []);

  const handleNFTStatusChecked = useCallback((hasNFT: boolean) => {
    setUserHasNFT(hasNFT);
    console.log("page.tsx: handleNFTStatusChecked called. Setting userHasNFT to:", hasNFT);
    // If NFT is now owned, re-evaluate voting status
    if (hasNFT && account && signer) {
      setLoadingVotingStatus(true);
      const currentContract = votingSystemContractRef.current;
      if (currentContract) {
          fetchCooldownEndTime(currentContract, account);
      }
    }
  }, [account, signer]);

  const fetchCooldownEndTime = useCallback(async (contract: ethers.Contract, address: string) => {
    setVotingError(null);
    try {
      const lastVoteTimeSecondsBigInt = await contract.lastVoted(address);
      const lastVoteTimeSeconds = Number(lastVoteTimeSecondsBigInt);

      let calculatedCooldownEndsAt: number | null = null;
      let userHasRecentlyVoted = false;

      if (lastVoteTimeSeconds === 0) {
        userHasRecentlyVoted = false;
      } else {
        const cooldownEndTimeBlockchainSeconds = lastVoteTimeSeconds + VOTING_COOLDOWN_SECONDS;
        calculatedCooldownEndsAt = cooldownEndTimeBlockchainSeconds * 1000;

        if (Date.now() < calculatedCooldownEndsAt) {
          userHasRecentlyVoted = true;
        } else {
          userHasRecentlyVoted = false;
          calculatedCooldownEndsAt = 0;
        }
      }

      setVoteCooldownEndsAt(calculatedCooldownEndsAt);
      setHasVotedToday(userHasRecentlyVoted);
      console.log(`page.tsx: lastVoted from contract: ${lastVoteTimeSeconds}s, calculated cooldown ends at: ${calculatedCooldownEndsAt}ms`);

    } catch (err: unknown) {
      console.error("Error fetching cooldown end time in page.tsx:", err);
      let errorMessage = 'Failed to fetch voting cooldown status.';
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
          errorMessage = (err as any).message;
      }
      setVotingError(errorMessage);
      setVoteCooldownEndsAt(0);
      setHasVotedToday(false);
    } finally {
      setLoadingVotingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (account && signer && votingSystemContractRef.current) {
      setLoadingVotingStatus(true);
      fetchCooldownEndTime(votingSystemContractRef.current, account);
    } else if (!account || !signer) {
      setLoadingVotingStatus(true);
      setHasVotedToday(false);
      setVoteCooldownEndsAt(null);
      setVotingError(null);
    }
  }, [account, signer, fetchCooldownEndTime]);

  const handleVoteCastSuccess = useCallback(async () => {
    setLoadingVotingStatus(true);
    if (votingSystemContractRef.current && account) {
      await fetchCooldownEndTime(votingSystemContractRef.current, account);
    }
  }, [fetchCooldownEndTime, account]);

  const handleCooldownExpired = useCallback(async () => {
    setLoadingVotingStatus(true);
    if (votingSystemContractRef.current && account) {
      await fetchCooldownEndTime(votingSystemContractRef.current, account);
    }
  }, [fetchCooldownEndTime, account]);

  // Determine the current step of the user flow
  let currentFlowComponent = null;

  if (!account || !signer) {
    // Flow 1: Connect Wallet (headline assumed to be inside ConnectWallet component)
    currentFlowComponent = (
      <ConnectWallet
        onConnect={handleWalletConnected}
        onDisconnect={handleWalletDisconnected}
      />
    );
  } else if (!userHasNFT) {
    // Flow 2: Mint NFT (only if connected AND no NFT)
    currentFlowComponent = (
      <MintNFT
        signer={signer}
        userAddress={account}
        onNFTStatusChecked={handleNFTStatusChecked}
      />
    );
  } else {
    // User has NFT. Now determine voting status (Flow 3 or 4)
    if (loadingVotingStatus) {
      currentFlowComponent = (
        <p className="text-blue-600 text-center">Loading voting status...</p>
      );
    } else if (votingError) {
      currentFlowComponent = (
        <p className="text-red-500 mt-4 text-center break-words max-w-full">
          Error: {votingError}
        </p>
      );
    } else if (hasVotedToday && voteCooldownEndsAt && voteCooldownEndsAt > Date.now()) {
      // Flow 4: Vote Complete (user has voted and is still in cooldown)
      currentFlowComponent = (
        <VoteComplete
          signer={signer}
          userAddress={account}
          voteCooldownEndsAt={voteCooldownEndsAt}
          onCooldownExpired={handleCooldownExpired}
        />
      );
    } else {
      // Flow 3: Vote Presentation (user has NFT and is eligible to vote)
      currentFlowComponent = (
        <VotePresentation
          signer={signer}
          userAddress={account}
          onVoteCast={handleVoteCastSuccess}
        />
      );
    }
  }

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-r from-slate-50 to-slate-100 text-gray-800 ${inter.className}`}>
      {/* This div is now transparent and no longer has the connected address text */}
      <div className="w-full max-w-4xl"> 
        {currentFlowComponent}
      </div>

      <footer className="mt-12 text-sm text-gray-500">
        Built with Next.js, Hardhat, and Ethers.js
      </footer>
    </main>
  );
}