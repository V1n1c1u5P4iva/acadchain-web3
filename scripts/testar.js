const hre = require("hardhat");

async function main() {
  // Endereco do contrato implantado na Sepolia
  const endereco = "0xe29433e3a1b94F5f745443A120F449f7E10317cB";

  // Conectar ao contrato
  const contrato = await hre.ethers.getContractAt(
    "DiplomaRegistry",
    endereco
  );

  // Obter a carteira configurada no Hardhat
  const [signer] = await hre.ethers.getSigners();

  console.log("\n===== TESTE DO DIPLOMA REGISTRY =====\n");

  console.log("Carteira:", signer.address);
  console.log("Dono do contrato:", await contrato.owner());

  // Verificar autorizacao
  const autorizado = await contrato.emissores(signer.address);

  console.log("Emissor autorizado:", autorizado);

  if (!autorizado) {
    console.log("ERRO: Carteira nao autorizada a emitir diplomas.");
    return;
  }

  // Dados de teste
  const identificador = "DIPLOMA-TESTE-001";
  const hash = hre.ethers.id(identificador);

  console.log("\nIdentificador:", identificador);
  console.log("Hash do diploma:", hash);

  // Verificar se o diploma ja existe
  const total = await contrato.totalDiplomas();

  let jaRegistrado = false;

  for (let i = 0n; i < total; i++) {
    const hashRegistrado = await contrato.hashPorIndice(i);

    if (hashRegistrado.toLowerCase() === hash.toLowerCase()) {
      jaRegistrado = true;
      break;
    }
  }

  // Registrar diploma somente se ainda nao existir
  if (!jaRegistrado) {
    console.log("\nRegistrando diploma...");

    const tx = await contrato.registrarDiploma(
      hash,
      "Aluno Teste",
      "Engenharia de Software",
      "Instituicao de Teste"
    );

    console.log("Aguardando confirmacao na blockchain...");

    const recibo = await tx.wait();

    console.log("\nDiploma registrado com sucesso!");
    console.log("Hash da transacao:", tx.hash);
    console.log("Gas utilizado:", recibo.gasUsed.toString());

    console.log(
      "Etherscan:",
      `https://sepolia.etherscan.io/tx/${tx.hash}`
    );
  } else {
    console.log("\nDiploma ja registrado. Pulando cadastro.");
  }

  // Consultar diploma
  console.log("\nConsultando diploma...");

  const diploma = await contrato.consultarDiploma(hash);

  console.log("\n===== DADOS DO DIPLOMA =====");

  console.log("Aluno:", diploma.aluno);
  console.log("Curso:", diploma.curso);
  console.log("Instituicao:", diploma.instituicao);

  console.log(
    "Data de emissao:",
    new Date(Number(diploma.dataEmissao) * 1000).toLocaleString("pt-BR")
  );

  console.log("Emissor:", diploma.emissor);
  console.log("Revogado:", diploma.revogado);
  console.log("Existe:", diploma.existe);

  // Verificar autenticidade
  console.log("\nVerificando autenticidade...");

  const autentico = await contrato.verificarAutenticidade(hash);

  console.log("\n===== RESULTADO DA VERIFICACAO =====");

  if (autentico) {
    console.log("SUCESSO: Diploma autentico e valido!");
  } else {
    console.log("ATENCAO: Diploma invalido ou revogado.");
  }

  console.log("\nTotal de diplomas:", (await contrato.totalDiplomas()).toString());

  console.log("\n===== TESTE FINALIZADO =====\n");
}

main().catch((erro) => {
  console.error("\nERRO DURANTE O TESTE:");
  console.error(erro);
  process.exitCode = 1;
});