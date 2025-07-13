"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, ethers } from "ethers";
import type { InterfaceAbi } from "ethers"; // ✅ Explicit ABI typing

type MintNFTProps = {
  walletAddress: string;
  contractAddress: string;
  contractABI: InterfaceAbi; // ✅ FIX: use correct type from ethers
};

export default function MintNFT({ walletAddress, contractAddress, contractABI }: MintNFTProps) {
  const [hasMinted, setHasMinted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ FIX: Memoize provider to avoid changing every render
  const provider = useMemo(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
  }, []);

  // ✅ FIX: useCallback with stable deps
  const checkIfMinted = useCallback(async () => {
    if (!provider) return;
    const contract = new Contract(contractAddress, contractABI, provider);
    try {
      const minted = await contract.hasMinted(walletAddress);
      setHasMinted(minted);
    } catch (error) {
      console.error("Error checking minted status:", error);
    }
  }, [provider, contractAddress, contractABI, walletAddress]);

  const mintNFT = async () => {
    if (!provider) return;
    setLoading(true);
    const signer = await provider.getSigner(); // ✅ `await` required for `BrowserProvider.getSigner()`
    const contract = new Contract(contractAddress, contractABI, signer);

    try {
      const tx = await contract.mint();
      await tx.wait();
      alert("Mint successful!");
      setHasMinted(true);
    } catch (error) {
      console.error("Mint failed:", error);
      alert("Mint failed. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      checkIfMinted();
    }
  }, [walletAddress, checkIfMinted]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-2xl mb-6">Welcome, {walletAddress}</h2>

      {hasMinted === null && <p>Checking NFT status...</p>}

      {hasMinted === true && <p>You already minted your VoterNFT. 🎉</p>}

      {hasMinted === false && (
        <button
          onClick={mintNFT}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          {loading ? "Minting..." : "Mint VoterNFT"}
        </button>
      )}
    </div>
  );
}
