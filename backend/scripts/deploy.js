const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const MultiSig = await hre.ethers.getContractFactory("MultiSig");
  
  // Définissez ici les adresses des propriétaires et le nombre de signatures requises
  const owners = [
    "0x65254408b633bcaC43eC5c4c2C538e86893af113",
    "0x7Fa3Cc7ffc79b5972c5E2458C69b4f740b1C5f1a"
  ];
  const requiredSignatures = 2;

  console.log("Deploying MultiSig contract...");
  const multiSig = await MultiSig.deploy(owners, requiredSignatures);

  await multiSig.waitForDeployment();

  console.log("MultiSig deployed to:", await multiSig.getAddress());
  console.log("Owners:", owners);
  console.log("Required signatures:", requiredSignatures);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });