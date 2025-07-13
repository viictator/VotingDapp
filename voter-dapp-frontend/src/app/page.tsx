"use client";

import { useEffect, useState } from "react";
import type { MetaMaskInpageProvider } from "@metamask/providers";

// Extend window type
declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>("");

  // Connect to MetaMask
  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[];

        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (err) {
        console.error("User rejected request:", err);
      }
    } else {
      alert("MetaMask not detected. Please install MetaMask.");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((result) => {
          const accounts = result as string[];
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch((err) => {
          console.error("Error checking accounts:", err);
        });
    }
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6">🗳 Voter DApp</h1>

      {walletAddress ? (
        <div className="text-center">
          <p className="mb-2">Connected wallet:</p>
          <p className="font-mono">{walletAddress}</p>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Connect Wallet
        </button>
      )}
    </main>
  );
}
