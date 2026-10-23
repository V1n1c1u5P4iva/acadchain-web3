
const hre = require("hardhat");

/**
 * Compila, implanta o DiplomaRegistry na rede selecionada pelo Hardhat
 * e exibe os dados necessários para identificar a implantação.
 */
async function main() {
  // Obtém a fábrica com ABI e bytecode gerados pelo compilador.
  const DiplomaRegistry = await hre.ethers.getContractFactory(
    "DiplomaRegistry"
  );

  // Envia a transação de implantação usando a conta configurada no Hardhat.
  const contrato = await DiplomaRegistry.deploy();

  // Aguarda a confirmação da implantação antes de consultar o endereço.
  await contrato.waitForDeployment();

  // O endereço é obtido do objeto conectado à implantação confirmada.
  const endereco = await contrato.getAddress();

  console.log("Contrato implantado com sucesso!");
  console.log("Endereco do contrato:", endereco);
  console.log("Rede: Sepolia");
  console.log("Dono do contrato:", await contrato.owner());
}

// Registra falhas no processo e sinaliza erro ao processo do Node.js.
main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
