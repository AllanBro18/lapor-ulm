import { ethers } from "ethers";
import FacilityReportData from "./FacilityReport.json";

export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Localhost hardhat default address
export const FacilityReportABI = FacilityReportData.abi;

export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error("MetaMask is not installed!");
};

export const getContract = async (signerOrProvider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, FacilityReportABI, signerOrProvider);
};
