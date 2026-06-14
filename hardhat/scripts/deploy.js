const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Send a dummy transaction to increment the deployer's nonce.
  // This shifts the deployed contract address away from the default
  // hardhat address (0x5FbDB2315678afecb367f032d93F642f64180aa3),
  // which is globally flagged by MetaMask/Blockaid as a deceptive/phishing address.
  console.log("Sending dummy self-transaction to increment nonce...");
  const tx = await deployer.sendTransaction({
    to: deployer.address,
    value: 0
  });
  await tx.wait();

  const FacilityReport = await hre.ethers.getContractFactory("FacilityReport");
  const facilityReport = await FacilityReport.deploy();

  await facilityReport.waitForDeployment();

  console.log("FacilityReport deployed to:", await facilityReport.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
