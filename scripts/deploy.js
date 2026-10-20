
const hre = require("hardhat");

async function main() {
  const DiplomaRegistry = await hre.ethers.getContractFactory(
    "DiplomaRegistry"
  );

  const contrato = await DiplomaRegistry.deploy();

  await contrato.waitForDeployment();

  const endereco = await contrato.getAddress();

  console.log("Contrato implantado com sucesso!");
  console.log("Endereco do contrato:", endereco);
  console.log("Rede: Sepolia");
  console.log("Dono do contrato:", await contrato.owner());
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
