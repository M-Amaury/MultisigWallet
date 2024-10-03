const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const MultiSigModule = buildModule("MultiSigModule", (m) => {

  const owners = [
    "0x65254408b633bcaC43eC5c4c2C538e86893af113"
    ,"0x7Fa3Cc7ffc79b5972c5E2458C69b4f740b1C5f1a"
  ];

  const quorumRequired = 2;

  const multiSig = m.contract("MultiSig", [owners, quorumRequired]);

  console.log("MultiSig deployed to:", multiSig.address);
  console.log("Owners:", owners);
  console.log("Required signatures:", quorumRequired);

  return { multiSig };
});

module.exports = MultiSigModule;