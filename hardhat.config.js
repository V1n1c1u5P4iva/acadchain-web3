// Carrega os plugins do Hardhat e as variáveis de ambiente usadas localmente.
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  // Mantém a compilação compatível com a versão declarada no contrato.
  solidity: "0.8.28",
  networks: {
    sepolia: {
      // O endpoint RPC e a chave da conta são lidos apenas do ambiente local.
      url: process.env.SEPOLIA_RPC_URL,
      // Chain ID oficial da rede de testes Ethereum Sepolia.
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : [],
    },
  },
};