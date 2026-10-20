
import { useState } from "react";
import { ethers } from "ethers";
import {
  GraduationCap, LayoutDashboard, Search, PlusCircle,
  Ban, Wallet, ShieldCheck, ExternalLink, FileCheck2,
  AlertTriangle, CheckCircle2, LoaderCircle, Blocks
} from "lucide-react";
import "./App.css";

const ADDRESS = "0xe29433e3a1b94F5f745443A120F449f7E10317cB";
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const CHAIN_ID = "0xaa36a7";

const ABI = [
  "function owner() view returns (address)",
  "function emissores(address) view returns (bool)",
  "function registrarDiploma(bytes32,string,string,string)",
  "function consultarDiploma(bytes32) view returns (tuple(string aluno,string curso,string instituicao,uint256 dataEmissao,address emissor,bool revogado,bool existe))",
  "function verificarAutenticidade(bytes32) view returns (bool)",
  "function revogarDiploma(bytes32)",
  "function totalDiplomas() view returns (uint256)"
];


async function gerarHashArquivo(arquivo) {
  const bytes = await arquivo.arrayBuffer();
  const resumo = await crypto.subtle.digest("SHA-256", bytes);

  return "0x" + Array.from(new Uint8Array(resumo))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Aceita um hash de arquivo ou um identificador tradicional.
function hashDaReferencia(valor) {
  const texto = valor.trim();

  if (/^0x[0-9a-fA-F]{64}$/.test(texto)) {
    return texto;
  }

  return ethers.id(texto);
}


const etherscan = (hash, tipo = "tx") =>
  `https://sepolia.etherscan.io/${tipo}/${hash}`;

function obterErro(erro) {
  if (erro?.code === 4001 || erro?.code === "ACTION_REJECTED") {
    return "Operação cancelada na MetaMask.";
  }
  const texto = String(
    erro?.shortMessage || erro?.reason || erro?.message || erro
  );
  if (texto.includes("Diploma inexistente")) return "Diploma não encontrado.";
  if (texto.includes("Diploma ja registrado")) return "Esse diploma já foi registrado.";
  if (texto.includes("reverted")) return `Transação rejeitada pelo contrato: ${texto}`;
  return texto;
}

export default function App() {
  const [aba, setAba] = useState("consultar");
  const [conta, setConta] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [txHash, setTxHash] = useState("");
  const [total, setTotal] = useState(null);

  const [idConsulta, setIdConsulta] = useState("");
  const [resultado, setResultado] = useState(null);

  const [arquivoRegistro, setArquivoRegistro] = useState(null);
const [hashArquivoRegistro, setHashArquivoRegistro] = useState("");
const [arquivoConsulta, setArquivoConsulta] = useState(null);

  const [registro, setRegistro] = useState({
    identificador: "",
    aluno: "",
    curso: "",
    instituicao: ""
  });

  const [idRevogacao, setIdRevogacao] = useState("");
  const [diplomaRevogacao, setDiplomaRevogacao] = useState(null);

  function contratoLeitura() {
    const provider = new ethers.JsonRpcProvider(RPC);
    return new ethers.Contract(ADDRESS, ABI, provider);
  }

  async function contratoEscrita() {
    if (!window.ethereum) throw new Error("Instale a MetaMask para continuar.");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const rede = await provider.getNetwork();

    if (rede.chainId !== 11155111n) {
      throw new Error("Selecione a rede Sepolia na MetaMask.");
    }

    const signer = await provider.getSigner();
    return new ethers.Contract(ADDRESS, ABI, signer);
  }

  async function atualizarTotal() {
    const quantidade = await contratoLeitura().totalDiplomas();
    setTotal(quantidade.toString());
  }

  async function conectar() {
    try {
      setOcupado(true);
      setMensagem("");
      if (!window.ethereum) throw new Error("MetaMask não encontrada.");

      await window.ethereum.request({ method: "eth_requestAccounts" });
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID }]
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const endereco = await signer.getAddress();
      const permitido = await contratoLeitura().emissores(endereco);

      setConta(endereco);
      setAutorizado(permitido);
      setMensagem(
        permitido
          ? "Carteira conectada e autorizada a emitir diplomas."
          : "Carteira conectada. Você pode consultar, mas não emitir diplomas."
      );
    } catch (erro) {
      setMensagem(obterErro(erro));
    } finally {
      setOcupado(false);
    }
  }

  async function consultarPorId(identificador) {
    const hash = hashDaReferencia(identificador);
    const contrato = contratoLeitura();

    // A função consultarDiploma reverte caso o registro não exista.
    try {
      const dados = await contrato.consultarDiploma(hash);
      const valido = await contrato.verificarAutenticidade(hash);

      return {
        hash,
        aluno: dados.aluno,
        curso: dados.curso,
        instituicao: dados.instituicao,
        dataEmissao: new Date(Number(dados.dataEmissao) * 1000)
          .toLocaleString("pt-BR"),
        emissor: dados.emissor,
        revogado: dados.revogado,
        valido
      };
    } catch (erro) {
      if (String(erro?.message || erro).includes("Diploma inexistente")) {
        return null;
      }
      // Alguns provedores não devolvem a razão da reversão.
      throw erro;
    }
  }


async function selecionarArquivoRegistro(evento) {
  const arquivo = evento.target.files?.[0];

  setArquivoRegistro(null);
  setHashArquivoRegistro("");
  setMensagem("");

  if (!arquivo) return;

  if (arquivo.type !== "application/pdf") {
    setMensagem("Selecione um arquivo PDF.");
    return;
  }

  try {
    setOcupado(true);

    const hash = await gerarHashArquivo(arquivo);

    setArquivoRegistro(arquivo);
    setHashArquivoRegistro(hash);
    setMensagem("Hash SHA-256 gerado com sucesso.");
  } catch (erro) {
    setMensagem(obterErro(erro));
  } finally {
    setOcupado(false);
  }
}

async function selecionarArquivoConsulta(evento) {
  const arquivo = evento.target.files?.[0];

  setArquivoConsulta(null);
  setResultado(null);
  setMensagem("");

  if (!arquivo) return;

  if (arquivo.type !== "application/pdf") {
    setMensagem("Selecione um arquivo PDF.");
    return;
  }

  try {
    setOcupado(true);

    const hash = await gerarHashArquivo(arquivo);

    setArquivoConsulta(arquivo);
    setIdConsulta(hash);
    setMensagem("Hash calculado. Clique em Verificar diploma.");
  } catch (erro) {
    setMensagem(obterErro(erro));
  } finally {
    setOcupado(false);
  }
}

  async function consultar() {
    if (!idConsulta.trim()) return setMensagem("Informe o identificador do diploma.");
    try {
      setOcupado(true);
      setMensagem("");
      setResultado(null);
      const dados = await consultarPorId(idConsulta);
      setResultado(dados);
      setMensagem(dados ? "Consulta realizada com sucesso." : "Diploma não encontrado.");
    } catch (erro) {
      setMensagem(obterErro(erro));
    } finally {
      setOcupado(false);
    }
  }

  async function emitir(evento) {
    evento.preventDefault();
    const { identificador, aluno, curso, instituicao } = registro;

  if (![aluno, curso, instituicao].every((v) => v.trim())) {
  return setMensagem("Preencha os dados do aluno, curso e instituição.");
}

if (!identificador.trim() && !hashArquivoRegistro) {
  return setMensagem("Informe um identificador ou selecione um PDF.");
}

    if (!conta || !autorizado) {
      return setMensagem("Conecte uma carteira autorizada.");
    }

    try {
      setOcupado(true);
      setMensagem("Confirme o registro na MetaMask...");
      setTxHash("");

      const contrato = await contratoEscrita();
    const hash = hashArquivoRegistro || hashDaReferencia(identificador);
      const tx = await contrato.registrarDiploma(
        hash,
        aluno.trim(),
        curso.trim(),
        instituicao.trim()
      );

      setMensagem("Transação enviada. Aguardando confirmação...");
      const recibo = await tx.wait();

      if (recibo.status !== 1) throw new Error("Transação não confirmada.");

      setTxHash(tx.hash);
      setMensagem("Diploma registrado com sucesso na Sepolia!");
      setRegistro({ identificador: "", aluno: "", curso: "", instituicao: "" });
      setArquivoRegistro(null);
setHashArquivoRegistro("");
      await atualizarTotal();
    } catch (erro) {
      setMensagem(obterErro(erro));
    } finally {
      setOcupado(false);
    }
  }

  async function localizarRevogacao() {
    if (!idRevogacao.trim()) return setMensagem("Informe o identificador.");
    try {
      setOcupado(true);
      setMensagem("");
      setDiplomaRevogacao(null);
      const dados = await consultarPorId(idRevogacao);
      setDiplomaRevogacao(dados);
      setMensagem(dados ? "Diploma localizado." : "Diploma não encontrado.");
    } catch (erro) {
      setMensagem(obterErro(erro));
    } finally {
      setOcupado(false);
    }
  }

  async function revogar() {
    if (!diplomaRevogacao) return;
    if (!conta || !autorizado) {
      return setMensagem("Conecte uma carteira autorizada.");
    }
    if (diplomaRevogacao.revogado) return setMensagem("Diploma já revogado.");

    if (!window.confirm("Revogar este diploma permanentemente?")) return;

    try {
      setOcupado(true);
      setTxHash("");
      setMensagem("Confirme a revogação na MetaMask...");

      const contrato = await contratoEscrita();
      const tx = await contrato.revogarDiploma(diplomaRevogacao.hash);

      setMensagem("Revogação enviada. Aguardando confirmação...");
      const recibo = await tx.wait();

      if (recibo.status !== 1) throw new Error("Transação não confirmada.");

      setTxHash(tx.hash);
      setDiplomaRevogacao({
        ...diplomaRevogacao,
        revogado: true,
        valido: false
      });
      setMensagem("Diploma revogado com sucesso!");
    } catch (erro) {
      setMensagem(obterErro(erro));
    } finally {
      setOcupado(false);
    }
  }

  function mudarAba(valor) {
    setAba(valor);
    setMensagem("");
    setTxHash("");
    if (valor === "inicio") atualizarTotal().catch(() => {});
  }

  const itensMenu = [
    { id: "inicio", titulo: "Visão geral", Icone: LayoutDashboard },
    { id: "consultar", titulo: "Consultar diploma", Icone: Search },
    { id: "emitir", titulo: "Emitir diploma", Icone: PlusCircle },
    { id: "revogar", titulo: "Revogar diploma", Icone: Ban }
  ];

  function PainelDiploma({ dados }) {
    if (!dados) return null;
    return (
      <div className="resultado">
        <div className="linha-resultado">
          <span className="rotulo">RESULTADO DA VERIFICAÇÃO</span>
          <span className={`status ${dados.valido ? "valido" : "revogado"}`}>
            {dados.valido ? "● Autêntico" : "● Revogado"}
          </span>
        </div>
        <h3>{dados.aluno}</h3>
        <p>{dados.curso}</p>
        <p>{dados.instituicao}</p>
        <div className="detalhes">
          <span>Emissão: {dados.dataEmissao}</span>
          <span>Emissor: {dados.emissor}</span>
          <span>Hash: {dados.hash}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="marca">
          <div className="marca-icone"><GraduationCap size={25} /></div>
          <strong>AcadChain</strong>
        </div>
        <div className="menu-label">REGISTRO ACADÊMICO</div>
        <nav>
          {itensMenu.map(({ id, titulo, Icone }) => (
            <button key={id} className={`menu-item ${aba === id ? "ativo" : ""}`}
              onClick={() => mudarAba(id)}>
              <Icone size={19} /> {titulo}
            </button>
          ))}
        </nav>
        <div className="rede">
          <span>● Ethereum Sepolia</span>
          <small>Ambiente de testes</small>
        </div>
      </aside>

      <main className="principal">
        <header className="topo">
          <div>
            <span className="subtitulo">Plataforma de certificados</span>
            <h1>Registro Acadêmico Blockchain</h1>
          </div>
          <button className="btn-carteira" onClick={conectar} disabled={ocupado}>
            <Wallet size={18} />
            {conta ? `${conta.slice(0, 6)}...${conta.slice(-4)}` : "Conectar MetaMask"}
          </button>
        </header>

        {aba === "inicio" && (
          <>
            <div className="metricas">
              <div className="metrica"><span>DIPLOMAS REGISTRADOS</span><strong>{total ?? "—"}</strong></div>
              <div className="metrica"><span>REDE BLOCKCHAIN</span><strong>Sepolia</strong></div>
              <div className="metrica"><span>CONTRATO</span><strong>Ativo</strong></div>
            </div>
            <section className="cartao">
              <h2>Bem-vindo ao AcadChain</h2>
              <p>Emita, consulte e revogue diplomas por meio de um contrato inteligente.</p>
              <div className="atalhos">
                <button onClick={() => mudarAba("consultar")}><Search /> Consultar diploma</button>
                <button onClick={() => mudarAba("emitir")}><PlusCircle /> Emitir diploma</button>
                <button onClick={() => mudarAba("revogar")}><Ban /> Revogar diploma</button>
              </div>
            </section>
          </>
        )}

        {aba === "consultar" && (
          <div className="colunas">
            <section className="cartao">
              <h2>Verificar autenticidade</h2>
              <p>Consulte um diploma usando seu identificador único.</p>
              <label>IDENTIFICADOR DO DIPLOMA</label>
              <input value={idConsulta}
                onChange={(e) => setIdConsulta(e.target.value)}
                placeholder="Ex.: DIPLOMA-TESTE-001" />

<div className="campo">
  <label htmlFor="verificar-pdf">
    OU SELECIONE UM DIPLOMA PDF
  </label>

  <input
    id="verificar-pdf"
    type="file"
    accept=".pdf,application/pdf"
    onChange={selecionarArquivoConsulta}
  />

  {arquivoConsulta && (
    <div className="informacao-hash">
      <strong>{arquivoConsulta.name}</strong>
      <span>Hash SHA-256 calculado:</span>
      <code>{idConsulta}</code>
    </div>
  )}
</div>

              <button className="btn-primario" disabled={ocupado} onClick={consultar}>
                <Search size={18} /> Verificar diploma
              </button>
              {resultado && <PainelDiploma dados={resultado} />}
            </section>

            <section className="cartao lateral">
              <h2>Acesso rápido</h2>
              <p>Gerencie certificados por uma carteira autorizada.</p>
              <button className="atalho azul" onClick={() => mudarAba("emitir")}>
                <PlusCircle /> Emitir novo diploma
              </button>
              <button className="atalho vermelho" onClick={() => mudarAba("revogar")}>
                <Ban /> Revogar diploma
              </button>
              <p className="contrato-label">Contrato inteligente</p>
              <a href={etherscan(ADDRESS, "address")} target="_blank" rel="noreferrer">
                Visualizar no Etherscan <ExternalLink size={15} />
              </a>
            </section>
          </div>
        )}

        {aba === "emitir" && (
          <div className="colunas">
            <form className="cartao" onSubmit={emitir}>
              <h2>Emitir novo diploma</h2>
              <p>Preencha os dados para registrar um certificado na blockchain.</p>
              {[
                ["identificador", "IDENTIFICADOR ÚNICO", "Ex.: DIPLOMA-2026-002"],
                ["aluno", "NOME COMPLETO DO ALUNO", "Nome do aluno"],
                ["curso", "CURSO", "Ex.: Engenharia de Software"],
                ["instituicao", "INSTITUIÇÃO DE ENSINO", "Nome da instituição"]
              ].map(([campo, titulo, placeholder]) => (
                <div className="campo" key={campo}>
                  <label htmlFor={campo}>{titulo}</label>
                  <input id={campo} required placeholder={placeholder}
                    value={registro[campo]}
                    onChange={(e) => setRegistro({ ...registro, [campo]: e.target.value })} />
                </div>
              ))}

<div className="campo">
  <label htmlFor="arquivo-diploma">
    ARQUIVO PDF DO DIPLOMA
  </label>

  <input
    id="arquivo-diploma"
    type="file"
    accept=".pdf,application/pdf"
    onChange={selecionarArquivoRegistro}
  />

  {arquivoRegistro && (
    <div className="informacao-hash">
      <strong>Arquivo: {arquivoRegistro.name}</strong>
      <span>Hash SHA-256:</span>
      <code>{hashArquivoRegistro}</code>
      <small>
        Este hash será utilizado para registrar o diploma.
      </small>
    </div>
  )}
</div>

              <div className="aviso"><ShieldCheck size={18} />
                O registro exige assinatura na MetaMask e ETH de teste para gás.
              </div>
              <button className="btn-primario" disabled={ocupado || !autorizado}>
                <PlusCircle size={18} /> Registrar diploma na Sepolia
              </button>
            </form>
            <section className="cartao lateral">
              <h2>Antes de emitir</h2>
              <div className="passos">
                <div>01 — Conecte sua MetaMask</div>
                <div>02 — Selecione a rede Sepolia</div>
                <div>03 — Use uma carteira autorizada</div>
                <div>04 — Confirme a transação</div>
              </div>
              <div className="aviso"><ShieldCheck size={18} />
                {autorizado ? "Carteira autorizada" : "Conecte um emissor autorizado"}
              </div>
            </section>
          </div>
        )}

        {aba === "revogar" && (
          <div className="colunas">
            <section className="cartao">
              <h2>Revogar um diploma</h2>
              <p>Invalide um certificado sem apagar seu histórico na blockchain.</p>
              <label>IDENTIFICADOR DO DIPLOMA</label>
              <input value={idRevogacao} placeholder="Ex.: DIPLOMA-TESTE-001"
                onChange={(e) => { setIdRevogacao(e.target.value); setDiplomaRevogacao(null); }} />
              <button className="btn-secundario" disabled={ocupado}
                onClick={localizarRevogacao}>
                <Search size={18} /> Consultar antes de revogar
              </button>
              {diplomaRevogacao && (
                <>
                  <PainelDiploma dados={diplomaRevogacao} />
                  <div className="aviso perigo">
                    <AlertTriangle size={18} /> A revogação é permanente no contrato atual.
                  </div>
                  <button className="btn-perigo" onClick={revogar}
                    disabled={ocupado || !autorizado || diplomaRevogacao.revogado}>
                    <Ban size={18} /> Revogar diploma selecionado
                  </button>
                </>
              )}
            </section>
            <section className="cartao lateral">
              <h2>Segurança e auditoria</h2>
              <p>Somente emissores autorizados podem revogar diplomas, conforme as regras do contrato.</p>
              <div className="aviso"><Blocks size={18} />
                O histórico das operações permanece na blockchain.
              </div>
            </section>
          </div>
        )}

        {mensagem && (
          <div className="notificacao">
            {ocupado ? <LoaderCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{mensagem}</span>
          </div>
        )}

        {txHash && (
          <a className="link-transacao" href={etherscan(txHash)}
            target="_blank" rel="noreferrer">
            Ver transação confirmada no Etherscan <ExternalLink size={15} />
          </a>
        )}

        <footer>
          <FileCheck2 size={16} />
          AcadChain — Ethereum Sepolia · Projeto acadêmico Web3
        </footer>
      </main>
    </div>
  );
}
