const hre = require("hardhat");

async function main() {
  const FacilityReport = await hre.ethers.getContractFactory("FacilityReport");
  const facilityReport = await FacilityReport.deploy();

  await facilityReport.waitForDeployment();

  console.log("FacilityReport deployed to:", await facilityReport.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
