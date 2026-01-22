/* =========================
   Operação • Tela do Policial
   =========================
   - Recebe o RE pela URL (?re=123456) OU pelo sessionStorage
   - Procura a patrulha que contém esse RE em composicaoRe
   - Exibe: horário, patrulha, CPP, missão e mapa
   ========================= */

/* Chaves do "banco" (mock) */
const CHAVE_PMS = "opCarnaval_pms";
const CHAVE_PATRULHAS = "opCarnaval_patrulhas";

/* Elementos da tela */
const badgeRe = document.getElementById("badgeRe");

const mensagem = document.getElementById("mensagem");
const conteudo = document.getElementById("conteudo");

const txtHorario = document.getElementById("txtHorario");
const txtPatrulha = document.getElementById("txtPatrulha");
const txtCpp = document.getElementById("txtCpp");
const txtMissao = document.getElementById("txtMissao");

const mapaIframe = document.getElementById("mapaIframe");
const mapaVazio = document.getElementById("mapaVazio");

const btnVoltar = document.getElementById("btnVoltar");
const btnSair = document.getElementById("btnSair");

/* =========================
   Funções de storage
   ========================= */

/* Lê patrulhas */
function lerPatrulhas() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_PATRULHAS) || "[]");
  return Array.isArray(dados) ? dados : [];
}

/* Lê PMs (não é obrigatório pra tela, mas pode ser útil depois) */
function lerPms() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_PMS) || "[]");
  return Array.isArray(dados) ? dados : [];
}

/* =========================
   Utilitários
   ========================= */

/* Normaliza RE: apenas números, 6 dígitos */
function normalizarRe(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 6);
}

/* Mostra mensagem na tela */
function mostrarMensagem(texto) {
  mensagem.textContent = texto;
  mensagem.classList.remove("d-none");
}

/* Esconde mensagem */
function esconderMensagem() {
  mensagem.classList.add("d-none");
}

/* Extrai src de um iframe (caso tenham colado iframe no cadastro) */
function extrairSrcIframe(texto) {
  const match = String(texto || "").match(/src\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

/* Remove aspas externas caso o usuário tenha colado "https://..." */
function removerAspasExternas(texto) {
  return String(texto || "").trim().replace(/^["']|["']$/g, "").trim();
}

/* Define o mapa no iframe (aceita link embed ou iframe colado) */
function aplicarMapa(valorMapa) {
  const bruto = removerAspasExternas(valorMapa);

  /* Se vazio: esconde iframe e mostra mensagem */
  if (!bruto) {
    mapaIframe.src = "";
    mapaIframe.classList.add("d-none");
    mapaVazio.classList.remove("d-none");
    return;
  }

  /* Se for iframe colado, extrai o src */
  let srcFinal = bruto;
  if (bruto.toLowerCase().includes("<iframe")) {
    srcFinal = extrairSrcIframe(bruto);
  }

  /* Se ainda não tem src válido */
  if (!srcFinal) {
    mapaIframe.src = "";
    mapaIframe.classList.add("d-none");
    mapaVazio.classList.remove("d-none");
    return;
  }

  /* Aplica src e mostra */
  mapaIframe.src = srcFinal;
  mapaIframe.classList.remove("d-none");
  mapaVazio.classList.add("d-none");
}

/* Procura a patrulha do PM pelo RE */
function encontrarPatrulhaDoRe(re) {
  const patrulhas = lerPatrulhas();

  return patrulhas.find((p) => {
    const comp = Array.isArray(p.composicaoRe) ? p.composicaoRe : [];
    return comp.map(String).includes(String(re));
  });
}

/* =========================
   Inicialização
   ========================= */
(function init() {
  /* 1) Obtém RE pela URL (preferência) */
  const params = new URLSearchParams(window.location.search);
  const reUrl = normalizarRe(params.get("re"));

  /* 2) Se não vier pela URL, tenta pegar do sessionStorage */
  const reSessao = normalizarRe(sessionStorage.getItem("opCarnaval_reAtual"));

  /* 3) Decide o RE final */
  const re = reUrl || reSessao;

  /* Mostra no badge */
  badgeRe.textContent = re ? `RE ${re}` : "RE --";

  /* Se não tem RE, orienta voltar */
  if (!re) {
    mostrarMensagem("RE não informado. Volte para a tela inicial e digite seu RE.");
    return;
  }

  /* Procura a patrulha do RE */
  const patrulha = encontrarPatrulhaDoRe(re);

  /* Se não encontrou */
  if (!patrulha) {
    mostrarMensagem("Não foi encontrada patrulha vinculada para este RE. Procure o responsável pelo cadastro.");
    return;
  }

  /* Preenche dados */
  esconderMensagem();
  conteudo.classList.remove("d-none");

  /* Horário */
  const hi = patrulha.horarioInicio || "--:--";
  const hf = patrulha.horarioFim || "--:--";
  txtHorario.textContent = `das ${hi} às ${hf}`;

  /* Patrulha */
  txtPatrulha.textContent = `Patrulha ${patrulha.numero || "--"}`;

  /* CPP */
  txtCpp.textContent = patrulha.cpp || "--";

  /* Missão */
  txtMissao.textContent = patrulha.missao || "--";

  /* Mapa */
  aplicarMapa(patrulha.mapa);
})();

/* =========================
   Eventos
   ========================= */

/* Voltar */
btnVoltar.addEventListener("click", () => {
  window.location.href = "index.html";
});

/* Sair (limpa a sessão e volta) */
btnSair.addEventListener("click", () => {
  sessionStorage.removeItem("opCarnaval_reAtual");
  window.location.href = "index.html";
});
