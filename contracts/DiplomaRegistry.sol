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
        string aluno;          // Nome do diplomado.
        string curso;          // Nome do curso.
        string instituicao;    // Nome da instituição emissora.
        uint256 dataEmissao;   // Timestamp do registro, obtido de block.timestamp.
        address emissor;       // Carteira que registrou o diploma.
        bool revogado;         // Indica se o diploma foi revogado.
        bool existe;           // Indica se há um registro para o hash.
    }

    // ---------------------------------------------------------------------
    // Estado
    // ---------------------------------------------------------------------

    /// @notice Carteira administradora do contrato.
    address public owner;

    /// @notice Indica quais carteiras podem registrar e revogar diplomas.
    mapping(address => bool) public emissores;

    /// @dev Associa o hash do arquivo aos metadados do diploma.
    mapping(bytes32 => Diploma) private diplomas;

    /// @dev Mantém os hashes registrados para permitir a enumeração dos diplomas.
    bytes32[] private hashes;

    // ---------------------------------------------------------------------
    // Eventos
    // ---------------------------------------------------------------------

    /// @notice Emitido quando uma carteira recebe autorização para emitir diplomas.
    event EmissorAutorizado(address indexed emissor);

    /// @notice Emitido quando a autorização de uma carteira é removida.
    event EmissorRemovido(address indexed emissor);

    /// @notice Emitido após o registro de um novo diploma.
    event DiplomaRegistrado(bytes32 indexed hashArquivo, address indexed emissor, string aluno);

    /// @notice Emitido após a revogação de um diploma.
    event DiplomaRevogado(bytes32 indexed hashArquivo, address indexed emissor);

    // ---------------------------------------------------------------------
    // Modificadores
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
    // Construtor
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

    /// @notice Autoriza uma carteira a registrar e revogar diplomas.
    /// @param _emissor Endereço da carteira que receberá a autorização.
    /// @dev Falha para o endereço zero ou se a carteira já estiver autorizada.
    function autorizarEmissor(address _emissor) external onlyOwner {
        require(_emissor != address(0), "Endereco invalido");
        require(!emissores[_emissor], "Ja autorizado");
        emissores[_emissor] = true;
        emit EmissorAutorizado(_emissor);
    }

    /// @notice Remove a autorização de uma carteira.
    /// @param _emissor Endereço da carteira cuja autorização será removida.
    /// @dev O dono não pode ser removido e a carteira deve estar autorizada.
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
    /// @param _aluno Nome do aluno diplomado.
    /// @param _curso Nome do curso concluído.
    /// @param _instituicao Nome da instituição emissora.
    /// @dev Falha se o hash for zero, já existir ou se aluno/curso estiverem vazios.
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

    /// @notice Revoga um diploma, mantendo seu histórico na blockchain.
    /// @param _hashArquivo Hash do arquivo do diploma a ser revogado.
    /// @dev Falha se o diploma não existir, já estiver revogado ou se o chamador
    ///      não for o emissor original nem o dono.
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

    /// @notice Consulta publicamente os dados de um diploma.
    /// @param _hashArquivo Hash do arquivo do diploma consultado.
    /// @return Dados registrados para o hash informado.
    /// @dev Falha se não houver diploma associado ao hash.
    function consultarDiploma(bytes32 _hashArquivo) external view returns (Diploma memory) {
        require(diplomas[_hashArquivo].existe, "Diploma inexistente");
        return diplomas[_hashArquivo];
    }

    /// @notice Verifica se um arquivo está registrado e não foi revogado.
    /// @param _hashArquivo Hash do arquivo que será verificado.
    /// @return True quando o registro existe e permanece válido; caso contrário, false.
    function verificarAutenticidade(bytes32 _hashArquivo) external view returns (bool) {
        Diploma storage d = diplomas[_hashArquivo];
        return d.existe && !d.revogado;
    }

    /// @notice Retorna a quantidade de diplomas registrados.
    /// @return Número de hashes armazenados no registro.
    function totalDiplomas() external view returns (uint256) {
        return hashes.length;
    }

    /// @notice Retorna o hash na posição informada para listagem no dashboard.
    /// @param _i Índice do hash no vetor de registros.
    /// @return Hash armazenado na posição solicitada.
    /// @dev Falha quando o índice está fora do intervalo do vetor.
    function hashPorIndice(uint256 _i) external view returns (bytes32) {
        require(_i < hashes.length, "Indice fora do intervalo");
        return hashes[_i];
    }
}
