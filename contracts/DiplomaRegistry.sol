// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DiplomaRegistry
 * @notice Registro acadêmico em blockchain: instituições autorizadas registram
 *         diplomas/certificados e qualquer pessoa pode consultá-los ou verificar
 *         a autenticidade de um arquivo pelo seu hash (SHA-256).
 * @dev Projeto acadêmico (2ª avaliação prática - Web3). Rede alvo: Sepolia.
 */
contract DiplomaRegistry {
    // ---------------------------------------------------------------------
    // Estruturas de dados
    // ---------------------------------------------------------------------

    /// @notice Dados de um diploma registrado.
    struct Diploma {
        string aluno;          // nome do diplomado
        string curso;          // nome do curso
        string instituicao;    // nome da instituição emissora
        uint256 dataEmissao;   // timestamp do registro (block.timestamp)
        address emissor;       // carteira que registrou
        bool revogado;         // true se o diploma foi revogado
        bool existe;           // true se o hash está registrado
    }

    // ---------------------------------------------------------------------
    // Estado
    // ---------------------------------------------------------------------

    address public owner;                          // dono do contrato (administração)
    mapping(address => bool) public emissores;     // carteiras autorizadas a registrar
    mapping(bytes32 => Diploma) private diplomas;  // hash do arquivo => diploma
    bytes32[] private hashes;                      // lista de hashes (para dashboard)

    // ---------------------------------------------------------------------
    // Eventos
    // ---------------------------------------------------------------------

    event EmissorAutorizado(address indexed emissor);
    event EmissorRemovido(address indexed emissor);
    event DiplomaRegistrado(bytes32 indexed hashArquivo, address indexed emissor, string aluno);
    event DiplomaRevogado(bytes32 indexed hashArquivo, address indexed emissor);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    /// @dev Restringe a função ao dono do contrato.
    modifier onlyOwner() {
        require(msg.sender == owner, "Apenas o dono pode executar");
        _;
    }

    /// @dev Restringe a função a emissores autorizados (o dono também é emissor).
    modifier onlyEmissor() {
        require(emissores[msg.sender], "Carteira nao autorizada a emitir");
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @notice Define quem implantou o contrato como dono e primeiro emissor.
    constructor() {
        owner = msg.sender;
        emissores[msg.sender] = true;
        emit EmissorAutorizado(msg.sender);
    }

    // ---------------------------------------------------------------------
    // Administração de emissores
    // ---------------------------------------------------------------------

    /// @notice Autoriza uma carteira a registrar diplomas.
    function autorizarEmissor(address _emissor) external onlyOwner {
        require(_emissor != address(0), "Endereco invalido");
        require(!emissores[_emissor], "Ja autorizado");
        emissores[_emissor] = true;
        emit EmissorAutorizado(_emissor);
    }

    /// @notice Remove a autorização de uma carteira.
    function removerEmissor(address _emissor) external onlyOwner {
        require(emissores[_emissor], "Nao e emissor");
        require(_emissor != owner, "Nao e possivel remover o dono");
        emissores[_emissor] = false;
        emit EmissorRemovido(_emissor);
    }

    // ---------------------------------------------------------------------
    // Escrita
    // ---------------------------------------------------------------------

    /// @notice Registra um diploma, identificado pelo hash do arquivo.
    /// @param _hashArquivo SHA-256 do PDF do diploma (calculado no frontend)
    function registrarDiploma(
        bytes32 _hashArquivo,
        string calldata _aluno,
        string calldata _curso,
        string calldata _instituicao
    ) external onlyEmissor {
        require(_hashArquivo != bytes32(0), "Hash invalido");
        require(!diplomas[_hashArquivo].existe, "Diploma ja registrado");
        require(bytes(_aluno).length > 0, "Aluno obrigatorio");
        require(bytes(_curso).length > 0, "Curso obrigatorio");

        diplomas[_hashArquivo] = Diploma({
            aluno: _aluno,
            curso: _curso,
            instituicao: _instituicao,
            dataEmissao: block.timestamp,
            emissor: msg.sender,
            revogado: false,
            existe: true
        });
        hashes.push(_hashArquivo);

        emit DiplomaRegistrado(_hashArquivo, msg.sender, _aluno);
    }

    /// @notice Revoga um diploma (ex.: emitido por engano). Somente o emissor original ou o dono.
    function revogarDiploma(bytes32 _hashArquivo) external onlyEmissor {
        Diploma storage d = diplomas[_hashArquivo];
        require(d.existe, "Diploma inexistente");
        require(!d.revogado, "Ja revogado");
        require(msg.sender == d.emissor || msg.sender == owner, "Sem permissao para revogar");

        d.revogado = true;
        emit DiplomaRevogado(_hashArquivo, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Leitura (públicas, sem custo de gas ao consultar)
    // ---------------------------------------------------------------------

    /// @notice Consulta pública dos dados de um diploma.
    function consultarDiploma(bytes32 _hashArquivo) external view returns (Diploma memory) {
        require(diplomas[_hashArquivo].existe, "Diploma inexistente");
        return diplomas[_hashArquivo];
    }

    /// @notice Verifica se um arquivo (pelo hash) está registrado e não foi revogado.
    function verificarAutenticidade(bytes32 _hashArquivo) external view returns (bool) {
        Diploma storage d = diplomas[_hashArquivo];
        return d.existe && !d.revogado;
    }

    /// @notice Quantidade total de diplomas registrados.
    function totalDiplomas() external view returns (uint256) {
        return hashes.length;
    }

    /// @notice Retorna o hash na posição informada (para listar no dashboard).
    function hashPorIndice(uint256 _i) external view returns (bytes32) {
        require(_i < hashes.length, "Indice fora do intervalo");
        return hashes[_i];
    }
}
