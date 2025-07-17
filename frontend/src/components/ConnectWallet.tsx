// src/components/ConnectWallet.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface ConnectWalletProps {
  onConnect: (address: string, provider: ethers.BrowserProvider, signer: ethers.Signer) => void;
  onDisconnect?: () => void;
}

export default function ConnectWallet({ onConnect, onDisconnect }: ConnectWalletProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sepoliaChainId = "0xaa36a7"; // Sepolia chain ID in hex (11155111 in decimal)

  // Explicitly check for window.ethereum on load outside of effects for immediate render logic
  const hasMetaMask = typeof window !== 'undefined' && (window as any).ethereum;

  // Function to handle account changes from MetaMask
  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length === 0) {
      console.log("MetaMask: No accounts found. User disconnected or locked.");
      setError("Wallet disconnected. Please connect to MetaMask.");
      onDisconnect?.();
    } else {
      console.log("MetaMask: Account changed to", accounts[0]);
      setError(null);
      // Attempt to re-establish full connection details for parent if MetaMask is available
      if (hasMetaMask) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          onConnect(accounts[0], provider, signer);
        } catch (err: any) {
          console.error("Error re-connecting on account change:", err);
          setError(`Failed to reconnect on account change: ${err.message || 'An unknown error occurred'}`);
          onDisconnect?.(); // Ensure parent state is cleared on re-connection failure
        }
      }
    }
  }, [hasMetaMask, onConnect, onDisconnect]);

  // Function to handle network (chain) changes from MetaMask
  const handleChainChanged = useCallback(async (chainId: string) => {
    console.log("MetaMask: Chain changed to", chainId);
    if (chainId !== sepoliaChainId) {
      setError(`Please switch MetaMask to the Sepolia network (Chain ID: ${parseInt(sepoliaChainId, 16)}).`);
      onDisconnect?.(); // Disconnect if on wrong network
    } else {
      setError(null);
      // If chain switched back to Sepolia, attempt to re-connect if an account is already authorized
      if (hasMetaMask) {
        try {
          const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            onConnect(accounts[0], provider, signer);
          } else {
            // No accounts authorized after switching back, clear any network error
            setError(null);
          }
        } catch (err: any) {
          console.error("Error re-connecting on chain change:", err);
          setError(`Failed to reconnect on chain change: ${err.message || 'An unknown error occurred'}`);
          onDisconnect?.(); // Ensure parent state is cleared on re-connection failure
        }
      }
    }
  }, [hasMetaMask, onConnect, onDisconnect, sepoliaChainId]);

  // Main function to connect to MetaMask (called by button click)
  const connectWallet = useCallback(async () => {
    try {
      const ethereum = (window as any).ethereum;

      if (!ethereum) {
        // This case should ideally be caught by initial hasMetaMask check, but safety net
        setError("MetaMask is not installed. Please install it to use this dApp.");
        return;
      }

      // Request accounts first (prompts user if not already connected)
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      if (accounts.length === 0) {
        setError("No accounts selected by the user in MetaMask.");
        return;
      }

      const account = accounts[0];
      console.log("MetaMask Requested Accounts:", account);

      // Check current chain ID
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      if (chainId !== sepoliaChainId) {
        setError(`Please switch MetaMask to the Sepolia network (Chain ID: ${parseInt(sepoliaChainId, 16)}).`);
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: sepoliaChainId }],
          });
          // If successful switch, the 'chainChanged' event listener will trigger handleChainChanged
          // which will then call onConnect if an account is connected.
          setError(null); // Clear the error as switch attempt was made
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            setError("Sepolia network not found in MetaMask. Please add it.");
          } else if (switchError.code === 4001) {
            setError("User rejected network switch. Please connect to Sepolia.");
          } else {
            setError(`Failed to switch to Sepolia network: ${switchError.message}`);
          }
          onDisconnect?.(); // Ensure parent state is cleared if switch fails
          return; // Stop here if network switch fails
        }
      } else {
        // If accounts are selected AND chain is correct, proceed to connect
        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();
        onConnect(account, provider, signer); // Inform parent about successful connection
        setError(null); // Clear any previous errors
      }

    } catch (err: any) {
      console.error("MetaMask connection error:", err);
      if (err.code === 4001) {
        setError("Connection rejected. Please approve in MetaMask to use the dApp.");
      } else {
        setError(`Failed to connect: ${err.message || 'An unknown error occurred'}`);
      }
      onDisconnect?.(); // Clear parent state on connection failure
    } finally {
      setIsLoading(false);
    }
  }, [onConnect, onDisconnect, sepoliaChainId]);


  // Effect to check initial connection status and setup/cleanup listeners
  useEffect(() => {
    const checkInitialConnection = async () => {
      setIsLoading(true);
      if (hasMetaMask) {
        const ethereum = (window as any).ethereum;
        try {
          // Check if accounts are already connected (eth_accounts does not prompt user)
          const accounts = await ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            const chainId = await ethereum.request({ method: 'eth_chainId' });
            if (chainId === sepoliaChainId) {
              const provider = new ethers.BrowserProvider(ethereum);
              const signer = await provider.getSigner();
              onConnect(accounts[0], provider, signer); // Call parent if already connected
              setError(null);
              console.log("Auto-connected to MetaMask on Sepolia:", accounts[0]);
            } else {
              setError(`MetaMask connected but on wrong network. Please switch to Sepolia (Chain ID: ${parseInt(sepoliaChainId, 16)}).`);
              onDisconnect?.(); // Disconnect parent if wrong network
            }
          } else {
            // No accounts authorized initially, clear any previous errors
            setError(null);
          }

          // Setup listeners
          ethereum.on('accountsChanged', handleAccountsChanged);
          ethereum.on('chainChanged', handleChainChanged);

        } catch (err: any) {
          console.error("Error during initial wallet check:", err);
          setError(`Error during initial wallet check: ${err.message || 'An unknown error occurred'}`);
          onDisconnect?.(); // Disconnect parent on initial check failure
        }
      } else {
        // MetaMask is not installed, set specific error from Figma
        setError("MetaMask is not installed. Please install it to use this dApp.");
      }
      setIsLoading(false);
    };

    checkInitialConnection();

    // Cleanup listeners on component unmount
    return () => {
      if (hasMetaMask) {
        const ethereum = (window as any).ethereum;
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [hasMetaMask, sepoliaChainId, handleAccountsChanged, handleChainChanged, onConnect, onDisconnect]); // Added onDisconnect to deps

  if (isLoading) {
    return <div className="text-gray-600 text-center">Loading wallet status...</div>;
  }

  // Render logic for the "Connect Wallet" page (Page 1)
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="flex flex-col justify-center items-center mb-8">
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-blue-200 to-blue-800 bg-clip-text text-transparent m-0"
        >
          VOTING DAPP
        </h1>
        <p className="m-0 text-lg bg-gradient-to-r from-blue-200 to-blue-800 bg-clip-text text-transparent">ON SEPOLIA NETWORK</p>
      </div>
      {/* "Connect your MetaMask wallet to begin." text */}
      {/* This text should only show if MetaMask is installed and no *critical* error prevents trying to connect */}
      

      {/* Connect Wallet Button */}
      {/* Show button if MetaMask is installed AND not currently in a state where a connection is active (handled by parent rendering)
          OR if there's an error that can be resolved by clicking the button (e.g., user rejected, wrong network) */}
      {hasMetaMask && (!error || error.includes("User rejected network switch") || error.includes("Connection rejected. Please approve")) && (
        <button
  onClick={connectWallet}
  className="group relative inline-flex items-center cursor-pointer justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium rounded-lg border-none outline-none shadow-none focus:ring-4 focus:outline-none focus:ring-blue-300"
>
  <span
    className="relative px-10 py-4 transition duration-300 ease-in-out bg-gradient-to-r text-white text-lg from-blue-200 to-blue-800 rounded-md group-hover:brightness-110 font-bold"
  >
    CONNECT WALLET
  </span>
</button>

      )}

      {hasMetaMask && !(error && error.includes("MetaMask is not installed")) && (
        <p className="text-gray-600 mb-6 text-center text-lg mt-4">Connect your MetaMask wallet to begin.</p>
      )}

      {/* Error messages */}
      {error && (
        <p className="text-red-500 mt-4 text-center text-base">
          {error}
        </p>
      )}
    </div>
  );
}