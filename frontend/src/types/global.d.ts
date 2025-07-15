// frontend/global.d.ts or frontend/src/types/ethereum.d.ts
import { ExternalProvider } from "ethers";

declare global {
  interface Window {
    ethereum?: ExternalProvider;
  }
}