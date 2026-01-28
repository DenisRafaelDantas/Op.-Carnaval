/* =========================
   Operação • Tela do Policial (Firestore) • POR DATA
   =========================
   - Recebe RE pela URL (?re=123456) ou sessionStorage
   - Recebe DATA pela URL (?data=YYYY-MM-DD)
   - Encontra patrulha onde escalasPorData[data].composicaoRe contém o RE
   - Exibe: horário (da data), patrulha, composição (da data), CPP, missão e mapa
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

/* Utilitários */
function normalizarRe(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 6);
}

function mostrarMensagem(texto) {
  mensagem.textContent = texto;
  mensagem.classList.remove("d-none");
}

function esconderMensagem() {
  mensagem.classList.add("d-none");
}

function extrairSrcIframe(texto) {
  const match = String(texto || "").match(/src\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function removerAspasExternas(texto) {
  return String(texto || "").trim().replace(/^["']|["']$/g, "").trim();
}

function aplicarMapa(valorMapa) {
  const bruto = removerAspasExternas(valorMapa);

  if (!bruto) {
    mapaIframe.src = "";
    mapaIframe.classList.add("d-none");
    mapaVazio.classList.remove("d-none");
    return;
  }

  let srcFinal = bruto;
  if (bruto.toLowerCase().includes("<iframe")) {
    srcFinal = extrairSrcIframe(bruto);
  }

  if (!srcFinal) {
    mapaIframe.src = "";
    mapaIframe.classList.add("d-none");
    mapaVazio.classList.remove("d-none");
    return;
  }

  mapaIframe.src = srcFinal;
  mapaIframe.classList.remove("d-none");
  mapaVazio.classList.add("d-none");
}

/* Ordenação por antiguidade (composição bonita) */
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

function nomePreferido(pm) {
  return pm?.nomeGuerra?.trim() || pm?.nomeCompleto?.trim() || "(Sem nome)";
}
function postoPreferido(pm) {
  return pm?.postoGraduacao?.trim() || "--";
}

/* Renderiza composição DA DATA */
function renderizarComposicaoDaData(patrulha, dataISO, pms) {
  if (!listaComposicaoPatrulha || !msgSemComposicao) return;

  listaComposicaoPatrulha.innerHTML = "";
  msgSemComposicao.classList.add("d-none");

  const escala = patrulha?.escalasPorData?.[dataISO];
  const composicao = Array.isArray(escala?.composicaoRe) ? escala.composicaoRe : [];

  if (composicao.length === 0) {
    msgSemComposicao.classList.remove("d-none");
    return;
  }

  const mapPms = new Map((Array.isArray(pms) ? pms : []).map((pm) => [String(pm.re), pm]));

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

/* Encontra patrulha do RE NA DATA */
function encontrarPatrulhaDoReNaData(re, dataISO, patrulhas) {
  const reStr = String(re);

  return (Array.isArray(patrulhas) ? patrulhas : []).find((p) => {
    const escala = p?.escalasPorData?.[dataISO];
    const comp = Array.isArray(escala?.composicaoRe) ? escala.composicaoRe : [];
    return comp.map(String).includes(reStr);
  });
}

/* Inicialização */
(async function init() {
  const params = new URLSearchParams(window.location.search);
  const reUrl = normalizarRe(params.get("re"));
  const reSessao = normalizarRe(sessionStorage.getItem("opCarnaval_reAtual"));
  const re = reUrl || reSessao;

  const dataISO = String(params.get("data") || "").trim(); // ✅ obrigatório no novo fluxo

  badgeRe.textContent = re ? `RE ${re}` : "RE --";

  if (!re) {
    mostrarMensagem("RE não informado. Volte para a tela inicial e digite seu RE.");
    return;
  }

  if (!dataISO) {
    mostrarMensagem("Data não informada. Volte e selecione a data da sua escala.");
    return;
  }

  try {
    const [patrulhas, pms] = await Promise.all([
      lerPatrulhasFS(),
      lerPmsFS()
    ]);

    const patrulha = encontrarPatrulhaDoReNaData(re, dataISO, patrulhas);

    if (!patrulha) {
      mostrarMensagem("Não foi encontrada escala vinculada para este RE na data selecionada.");
      return;
    }

    const escala = patrulha?.escalasPorData?.[dataISO];

    esconderMensagem();
    conteudo.classList.remove("d-none");

    const hi = escala?.horarioInicio || "--:--";
    const hf = escala?.horarioFim || "--:--";
    txtHorario.textContent = `das ${hi} às ${hf}`;

    txtPatrulha.textContent = `Patrulha ${patrulha.numero || "--"}`;

    txtCpp.textContent = patrulha.cpp || "--";
    txtMissao.textContent = patrulha.missao || "--";

    aplicarMapa(patrulha.mapa);

    renderizarComposicaoDaData(patrulha, dataISO, pms);
  } catch (err) {
    console.error(err);
    mostrarMensagem("Falha ao carregar dados do Firebase. Verifique sua conexão e tente novamente.");
  }
})();

/* Voltar */
if (btnVoltar) {
  btnVoltar.addEventListener("click", () => {
    // volta para a lista de datas mantendo o RE
    const re = normalizarRe(sessionStorage.getItem("opCarnaval_reAtual"));
    if (re) window.location.href = `escala.html?re=${encodeURIComponent(re)}`;
    else window.location.href = "index.html";
  });
}
