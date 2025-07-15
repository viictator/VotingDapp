// src/components/ConnectWallet.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface ConnectWalletProps {
  onConnect: (address: string, provider: ethers.BrowserProvider, signer: ethers.Signer) => void;
  onDisconnect?: () => void;
}

export default function ConnectWallet({ onConnect, onDisconnect }: ConnectWalletProps) {
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sepoliaChainId = "0xaa36a7"; // Sepolia chain ID in hex (11155111 in decimal)

  // Function to handle account changes from MetaMask
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      console.log("MetaMask: No accounts found. User disconnected or locked.");
      setCurrentAccount(null);
      setError("Wallet disconnected. Please connect to MetaMask.");
      onDisconnect?.();
    } else if (accounts[0] !== currentAccount) {
      console.log("MetaMask: Account changed to", accounts[0]);
      setCurrentAccount(accounts[0]);
      setError(null);
      connectWallet(); // Re-trigger connection logic to update provider/signer
    }
  }, [currentAccount, onDisconnect]); // Fixed dependency: currentAccount and onDisconnect are correct here

  // Function to handle network (chain) changes from MetaMask
  const handleChainChanged = useCallback((chainId: string) => {
    console.log("MetaMask: Chain changed to", chainId);
    if (chainId !== sepoliaChainId) {
      setError(`Please switch MetaMask to the Sepolia network (Chain ID: ${parseInt(sepoliaChainId, 16)}).`);
      setCurrentAccount(null);
      onDisconnect?.();
    } else {
      setError(null);
      connectWallet(); // Reconnect to get the correct provider/signer for the new chain
    }
  }, [onDisconnect, sepoliaChainId]);

  // Main function to connect to MetaMask
  const connectWallet = useCallback(async () => { // <--- Added useCallback here
    try {
      const { ethereum } = window; // No more 'as any'

      if (!ethereum) {
        setError("MetaMask is not installed. Please install it to use this dApp.");
        return;
      }

      // Check current chain ID
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      if (chainId !== sepoliaChainId) {
        setError(`Please switch MetaMask to the Sepolia network (Chain ID: ${parseInt(sepoliaChainId, 16)}).`);
        try {
            await ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: sepoliaChainId }],
            });
            setError(null);
        } catch (switchError: any) { // Keep any here for unknown error object structure
            if (switchError.code === 4902) {
                setError("Sepolia network not found in MetaMask. Please add it.");
            } else if (switchError.code === 4001) {
                setError("User rejected network switch. Please connect to Sepolia.");
            } else {
                setError(`Failed to switch to Sepolia network: ${switchError.message}`);
            }
            setCurrentAccount(null);
            return;
        }
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      if (accounts.length === 0) {
        setError("No accounts selected by the user in MetaMask.");
        setCurrentAccount(null);
        return;
      }

      const account = accounts[0];
      setCurrentAccount(account);
      setError(null);
      console.log("MetaMask Connected:", account);

      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      onConnect(account, provider, signer);

    } catch (err: any) { // Keep any here for unknown error object structure
      console.error("MetaMask connection error:", err);
      if (err.code === 4001) {
        setError("Connection rejected. Please approve in MetaMask to use the dApp.");
      } else {
        setError(`Failed to connect: ${err.message || 'An unknown error occurred'}`);
      }
      setCurrentAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, [onConnect, onDisconnect, sepoliaChainId, currentAccount]); // Added useCallback deps

  // Check wallet connection status on component mount
  useEffect(() => {
    const checkConnectionAndSetupListeners = async () => {
        setIsLoading(true);
        if (typeof window !== 'undefined' && window.ethereum) {
            const { ethereum } = window; // No more 'as any'
            try {
                const accounts = await ethereum.request({ method: "eth_accounts" });
                if (accounts.length > 0) {
                    const chainId = await ethereum.request({ method: 'eth_chainId' });
                    if (chainId === sepoliaChainId) {
                        setCurrentAccount(accounts[0]);
                        setError(null);
                        const provider = new ethers.BrowserProvider(ethereum);
                        const signer = await provider.getSigner();
                        onConnect(accounts[0], provider, signer);
                        console.log("Auto-connected to MetaMask on Sepolia:", accounts[0]);
                    } else {
                        setError(`MetaMask connected but on wrong network. Please switch to Sepolia (Chain ID: ${parseInt(sepoliaChainId, 16)}).`);
                        setCurrentAccount(null);
                    }
                } else {
                    setCurrentAccount(null);
                    console.log("No authorized accounts found on load.");
                }

                ethereum.on('accountsChanged', handleAccountsChanged);
                ethereum.on('chainChanged', handleChainChanged);

            } catch (err: any) { // Keep any here for unknown error object structure
                console.error("Error checking initial connection:", err);
                setError(`Error during initial wallet check: ${err.message}`);
                setCurrentAccount(null);
            }
        } else {
            setError("MetaMask is not installed. Please install it to use this dApp.");
            setCurrentAccount(null);
        }
        setIsLoading(false);
    };

    checkConnectionAndSetupListeners();

    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [handleAccountsChanged, handleChainChanged, onConnect, sepoliaChainId]); // Dependencies for useEffect

  if (isLoading) {
    return <div className="text-white text-center">Loading wallet status...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {currentAccount ? (
        <div className="text-green-400 text-lg">
          Connected: {currentAccount.substring(0, 6)}...{currentAccount.substring(currentAccount.length - 4)}
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Connect MetaMask
        </button>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}