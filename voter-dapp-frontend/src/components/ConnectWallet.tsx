"use client";

type ConnectWalletProps = {
  onConnect: (address: string) => void;
};

export default function ConnectWallet({ onConnect }: ConnectWalletProps) {
  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
        if (accounts.length > 0) {
        onConnect(accounts[0]);
        }

      } catch (error) {
        console.error("User rejected request", error);
      }
    } else {
      alert("MetaMask not detected. Please install MetaMask.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-6">🗳 Voter DApp</h1>
      <button
        onClick={connectWallet}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Connect Wallet
      </button>
    </div>
  );
}
