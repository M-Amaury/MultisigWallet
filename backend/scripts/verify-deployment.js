const hre = require("hardhat");

async function main() {
  const contractAddress = "0x7Adb478881DdfaED820Dbe6449E5802d3BA1a71b"; // Remplacez par l'adresse de votre contrat déployé
  const MultiSig = await hre.ethers.getContractFactory("MultiSig");
  const multiSig = await MultiSig.attach(contractAddress);

  console.log("Vérification du contrat déployé à l'adresse:", contractAddress);

  const owners = await multiSig.getOwners();
  console.log("Propriétaires du contrat:", owners);

  const quorumRequired = await multiSig.quorumRequired();
  console.log("Nombre de signatures requises:", quorumRequired.toString());

  // Vérifiez si les adresses spécifiques sont bien des propriétaires
  const expectedOwners = [
    "0x65254408b633bcaC43eC5c4c2C538e86893af113",
    "0x7Fa3Cc7ffc79b5972c5E2458C69b4f740b1C5f1a"
  ];
  for (const owner of expectedOwners) {
    const isOwner = await multiSig.isOwner(owner);
    console.log(`L'adresse ${owner} est-elle un propriétaire? ${isOwner}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });