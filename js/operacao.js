/* =========================
   Operação • Tela do Policial (Firestore)
   =========================
   - Recebe o RE pela URL (?re=123456) OU pelo sessionStorage
   - Busca patrulhas no Firestore e encontra qual contém esse RE em composicaoRe
   - Exibe: horário, patrulha, composição, CPP, missão e mapa
   ========================= */

import { lerPatrulhasFS, lerPmsFS } from "./repositorio-firestore.js";

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

const listaComposicaoPatrulha = document.getElementById("listaComposicaoPatrulha");
const msgSemComposicao = document.getElementById("msgSemComposicao");

const btnVoltar = document.getElementById("btnVoltar");

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

/* =========================
   Ordenação por antiguidade (pra composição ficar bonita)
   ========================= */

function normalizarPosto(texto) {
  return String(texto || "")
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PESO_POSTO = new Map([
  ["CEL", 100], ["CORONEL", 100],
  ["TC", 90], ["TEN CEL", 90], ["TENENTE CORONEL", 90], ["TEN-CEL", 90],
  ["MAJ", 80], ["MAJOR", 80],
  ["CAP", 70], ["CAPITAO", 70],
  ["1 TEN", 60], ["1º TEN", 60], ["1ºTEN", 60], ["PRIMEIRO TENENTE", 60], ["1TEN", 60],
  ["2 TEN", 50], ["2º TEN", 50], ["2ºTEN", 50], ["SEGUNDO TENENTE", 50], ["2TEN", 50],
  ["ASP", 45], ["ASP OF", 45], ["ASPIRANTE", 45], ["ASPIRANTE A OFICIAL", 45],
  ["ST", 40], ["SUBTENENTE", 40],
  ["1 SGT", 30], ["1º SGT", 30], ["1SGT", 30], ["PRIMEIRO SARGENTO", 30],
  ["2 SGT", 25], ["2º SGT", 25], ["2SGT", 25], ["SEGUNDO SARGENTO", 25],
  ["3 SGT", 20], ["3º SGT", 20], ["3SGT", 20], ["TERCEIRO SARGENTO", 20],
  ["CB", 10], ["CABO", 10],
  ["SD", 1], ["SOLDADO", 1],
  ["SD 2 CL", 0], ["SD 2ª CL", 0], ["SD 2A CL", 0],
  ["SOLDADO 2 CLASSE", 0], ["SOLDADO 2ª CLASSE", 0]
]);

function pesoPostoTexto(postoGraduacao) {
  const p = normalizarPosto(postoGraduacao);

  if (PESO_POSTO.has(p)) return PESO_POSTO.get(p);

  for (const [chave, peso] of PESO_POSTO.entries()) {
    if (p.startsWith(chave)) return peso;
  }

  return -1;
}

function ordenarComposicaoPorAntiguidade(itens) {
  return [...itens].sort((a, b) => {
    const pa = pesoPostoTexto(a?.postoGraduacao);
    const pb = pesoPostoTexto(b?.postoGraduacao);
    if (pb !== pa) return pb - pa;

    const rea = String(a?.re || "");
    const reb = String(b?.re || "");
    if (rea !== reb) return rea.localeCompare(reb, "pt-BR");

    const na = String(a?.nomeExibir || "");
    const nb = String(b?.nomeExibir || "");
    return na.localeCompare(nb, "pt-BR");
  });
}

/* =========================
   Firestore helpers
   ========================= */

/* Procura a patrulha do PM pelo RE (varrendo patrulhas) */
function encontrarPatrulhaDoReEmLista(re, patrulhas) {
  return patrulhas.find((p) => {
    const comp = Array.isArray(p.composicaoRe) ? p.composicaoRe : [];
    return comp.map(String).includes(String(re));
  });
}

function nomePreferido(pm) {
  return pm?.nomeGuerra?.trim() || pm?.nomeCompleto?.trim() || "(Sem nome)";
}

function postoPreferido(pm) {
  return pm?.postoGraduacao?.trim() || "--";
}

/* Renderiza composição da patrulha */
function renderizarComposicaoDaPatrulha(patrulha, pms) {
  if (!listaComposicaoPatrulha || !msgSemComposicao) return;

  listaComposicaoPatrulha.innerHTML = "";
  msgSemComposicao.classList.add("d-none");

  const composicao = Array.isArray(patrulha?.composicaoRe) ? patrulha.composicaoRe : [];

  if (composicao.length === 0) {
    msgSemComposicao.classList.remove("d-none");
    return;
  }

  const mapPms = new Map((Array.isArray(pms) ? pms : []).map((pm) => [String(pm.re), pm]));

  // monta itens com dados (e ordena)
  const itens = composicao.map((re) => {
    const pm = mapPms.get(String(re));
    return {
      re: String(re),
      postoGraduacao: pm?.postoGraduacao || "",
      nomeExibir: pm ? nomePreferido(pm) : "(não encontrado no cadastro)",
      existe: Boolean(pm)
    };
  });

  const ordenados = ordenarComposicaoPorAntiguidade(itens);

  ordenados.forEach((item) => {
    const texto = item.existe
      ? `${postoPreferido({ postoGraduacao: item.postoGraduacao })} ${item.re} – ${item.nomeExibir}`
      : `RE ${item.re} – (não encontrado no cadastro)`;

    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = texto;
    listaComposicaoPatrulha.appendChild(li);
  });
}

/* =========================
   Inicialização
   ========================= */
(async function init() {
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

  try {
    // Carrega patrulhas e PMs do Firestore
    const [patrulhas, pms] = await Promise.all([
      lerPatrulhasFS(),
      lerPmsFS()
    ]);

    /* Procura a patrulha do RE */
    const patrulha = encontrarPatrulhaDoReEmLista(re, patrulhas);

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

    /* Composição */
    renderizarComposicaoDaPatrulha(patrulha, pms);
  } catch (err) {
    console.error(err);
    mostrarMensagem("Falha ao carregar dados do Firebase. Verifique sua conexão e tente novamente.");
  }
})();

/* =========================
   Eventos
   ========================= */

/* Voltar */
if (btnVoltar) {
  btnVoltar.addEventListener("click", () => {
    // se quiser “limpar” o RE da sessão ao voltar:
    sessionStorage.removeItem("opCarnaval_reAtual");
    window.location.href = "index.html";
  });
}
