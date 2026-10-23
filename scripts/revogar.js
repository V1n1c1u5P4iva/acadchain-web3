const hre = require("hardhat");

/**
 * Consulta e, quando necessário, revoga o diploma de teste já implantado.
 * O script também confirma o estado final por meio da função de autenticidade.
 */
async function main() {
  // Endereço do contrato implantado na rede Sepolia.
  const endereco = "0xe29433e3a1b94F5f745443A120F449f7E10317cB";

  // Cria uma instância conectada ao contrato para executar leituras e escrita.
  const contrato = await hre.ethers.getContractAt(
    "DiplomaRegistry",
    endereco
  );

  // O mesmo identificador usado no registro de teste gera o mesmo hash bytes32.
  const identificador = "DIPLOMA-TESTE-001";
  const hash = hre.ethers.id(identificador);

  console.log("\n===== TESTE DE REVOGACAO =====");

  const diploma = await contrato.consultarDiploma(hash);

  console.log("Aluno:", diploma.aluno);
  console.log("Revogado antes:", diploma.revogado);

  if (!diploma.revogado) {
    console.log("\nRevogando diploma...");

    // A transação só é considerada concluída após a confirmação do recibo.
    const tx = await contrato.revogarDiploma(hash);
    const recibo = await tx.wait();

    console.log("Transacao:", tx.hash);
    console.log("Gas utilizado:", recibo.gasUsed.toString());
    console.log(
      "Etherscan:",
      `https://sepolia.etherscan.io/tx/${tx.hash}`
    );
  } else {
    console.log("Diploma ja estava revogado.");
  }

  const diplomaAtualizado = await contrato.consultarDiploma(hash);
  const autentico = await contrato.verificarAutenticidade(hash);

  console.log("\n===== RESULTADO =====");
  console.log("Revogado:", diplomaAtualizado.revogado);
  console.log("Autentico:", autentico);

  if (diplomaAtualizado.revogado && !autentico) {
    console.log("SUCESSO: Revogacao funcionando!");
  } else {
    throw new Error("Falha na verificacao da revogacao.");
  }
}

// Propaga a falha para o processo e mantém o diagnóstico no console.
main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});