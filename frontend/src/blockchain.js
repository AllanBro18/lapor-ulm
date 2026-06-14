import { ethers } from "ethers";
import FacilityReportData from "./FacilityReport.json";

export const CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // Localhost hardhat custom address
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
