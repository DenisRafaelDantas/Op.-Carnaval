/* =========================
   Operação • Tela do Policial (Firestore) • POR DATA
   =========================
   - Recebe RE pela URL (?re=123456) ou sessionStorage
   - Recebe DATA pela URL (?data=YYYY-MM-DD)
   - Encontra patrulha onde:
       patrulha.dataEscala === dataISO  E
       patrulha.composicaoRe contém o RE
   - Exibe: data/horário, local, revista, patrulha, composição, CPP, missão e mapa
   - ✅ NOVO: Comandante (comandanteRe) fica em vermelho
   ========================= */

import { lerPatrulhaDoReNaDataFS, lerPmPorReFS } from "./repositorio-firestore.js";

/* Elementos da tela */
const badgeRe = document.getElementById("badgeRe");

const mensagem = document.getElementById("mensagem");
const conteudo = document.getElementById("conteudo");

const txtHorario = document.getElementById("txtHorario");
const txtLocal = document.getElementById("txtLocal");
const txtRevista = document.getElementById("txtRevista");

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

/* Renderiza composição (modelo novo: patrulha.composicaoRe) */
function renderizarComposicaoDaPatrulha(patrulha, pmsFallback) {
  if (!listaComposicaoPatrulha || !msgSemComposicao) return;

  listaComposicaoPatrulha.innerHTML = "";
  msgSemComposicao.classList.add("d-none");

  const composicao = Array.isArray(patrulha?.composicaoRe) ? patrulha.composicaoRe : [];
  const comandanteRe = String(patrulha?.comandanteRe || "").trim();

  // ✅ grupos ABC (objeto: { "123456": "A", ... })
  const gruposABC = (patrulha?.gruposABC && typeof patrulha.gruposABC === "object")
    ? patrulha.gruposABC
    : {};

  // ✅ NOVO: dados mínimos já salvos na patrulha (reduz leituras)
  const detalhes = (patrulha?.composicaoDetalhada && typeof patrulha.composicaoDetalhada === "object")
    ? patrulha.composicaoDetalhada
    : {};

  if (composicao.length === 0) {
    msgSemComposicao.classList.remove("d-none");
    return;
  }

  // fallback opcional: se não houver detalhes, usa pmsFallback (carregado por getDoc)
  const mapPmsFallback = new Map((Array.isArray(pmsFallback) ? pmsFallback : []).map((pm) => [String(pm.re), pm]));

  const itens = composicao.map((re) => {
    const r = String(re);
    const det = detalhes?.[r];
    const pmFallback = mapPmsFallback.get(r);

    const postoGraduacao = String(det?.postoGraduacao || pmFallback?.postoGraduacao || "").trim();

    const nomeExibir = String(
      det?.nomeExibir
      || det?.nomeGuerra
      || det?.nomeCompleto
      || (pmFallback ? nomePreferido(pmFallback) : "(não encontrado no cadastro)")
    ).trim();

    return {
      re: r,
      postoGraduacao,
      nomeExibir,
      existe: Boolean(det || pmFallback),
      // ✅ pega o grupo (A/B/C) se existir
      grupo: String(gruposABC?.[r] || "").toUpperCase().trim()
    };
  });

  const ordenados = ordenarComposicaoPorAntiguidade(itens);

  const header = document.createElement("li");
  header.className = "list-group-item";
  header.innerHTML = `
    <div class="d-flex align-items-center justify-content-between gap-3">
      <div class="fw-semibold">PM</div>
      <div class="fw-semibold text-body-secondary">Grupo</div>
    </div>
  `;
  listaComposicaoPatrulha.appendChild(header);

  ordenados.forEach((item) => {
    const ehCmd = comandanteRe && String(item.re) === String(comandanteRe);

    const texto = item.existe
      ? `${postoPreferido({ postoGraduacao: item.postoGraduacao })} ${item.re} – ${item.nomeExibir}`
      : `RE ${item.re} – (não encontrado no cadastro)`;

    const grupo = (item.grupo === "A" || item.grupo === "B" || item.grupo === "C")
      ? item.grupo
      : "--";

    const li = document.createElement("li");
    li.className = "list-group-item";

    if (ehCmd) {
      li.classList.add("list-group-item-danger", "fw-semibold");
    }

    li.innerHTML = `
      <div class="d-flex align-items-center justify-content-between gap-3">
        <div class="text-break">
          ${ehCmd ? `${texto} (CMD)` : texto}
        </div>
        <div class="ms-auto">
          <span class="badge text-bg-secondary">${grupo}</span>
        </div>
      </div>
    `;

    listaComposicaoPatrulha.appendChild(li);
  });
}



/* Encontra patrulha do RE NA DATA (modelo novo) */
function encontrarPatrulhaDoReNaData(re, dataISO, patrulhas) {
  const reStr = String(re);
  const dataStr = String(dataISO || "").trim();

  return (Array.isArray(patrulhas) ? patrulhas : []).find((p) => {
    const d = String(p?.dataEscala || "").trim();
    if (d !== dataStr) return false;

    const comp = Array.isArray(p?.composicaoRe) ? p.composicaoRe : [];
    return comp.map(String).includes(reStr);
  });
}

/* Horário (modelo novo) */
function textoHorario(hIni, hFim) {
  const a = String(hIni || "").trim();
  const b = String(hFim || "").trim();
  if (!a && !b) return "--:--";
  if (a && b) return `das ${a} às ${b}`;
  if (a) return `início ${a}`;
  return `término ${b}`;
}

/* Inicialização */
(async function init() {
  const params = new URLSearchParams(window.location.search);
  const reUrl = normalizarRe(params.get("re"));
  const reSessao = normalizarRe(sessionStorage.getItem("opCarnaval_reAtual"));
  const re = reUrl || reSessao;

  const dataISO = String(params.get("data") || "").trim();

  // mantém o RE na sessão para o "Voltar"
  if (re) sessionStorage.setItem("opCarnaval_reAtual", re);

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
    // ✅ OTIMIZAÇÃO: evita ler TODAS as patrulhas e TODOS os PMs
    // 1) lê apenas as patrulhas da data (muito menos docs)
    // 2) encontra a patrulha do RE nessa data
    const patrulha = await lerPatrulhaDoReNaDataFS(re, dataISO);

    if (!patrulha) {
      mostrarMensagem("Não foi encontrada escala vinculada para este RE na data selecionada.");
      return;
    }

    /* =========================================================
       ✅ Composição sem custo alto:
       - Se a patrulha já tiver composicaoDetalhada, NÃO lê coleção "pms"
       - Se não tiver (patrulhas antigas), faz fallback (poucas leituras)
       ========================================================= */
    const detalhes = (patrulha?.composicaoDetalhada && typeof patrulha.composicaoDetalhada === "object")
      ? patrulha.composicaoDetalhada
      : {};

    let pms = [];

    if (!detalhes || Object.keys(detalhes).length === 0) {
      const composicao = Array.isArray(patrulha?.composicaoRe) ? patrulha.composicaoRe.map(String) : [];
      pms = await Promise.all(
        composicao.map(async (reItem) => {
          try {
            const pm = await lerPmPorReFS(reItem);
            return pm ? { ...pm, re: String(reItem) } : null;
          } catch {
            return null;
          }
        })
      ).then((arr) => arr.filter(Boolean));
    }
esconderMensagem();
    conteudo.classList.remove("d-none");

    const hi = patrulha?.horarioInicio || "--:--";
    const hf = patrulha?.horarioFim || "--:--";

    // formata data para BR
    const dataBR = (() => {
      const [y, m, d] = String(dataISO || "").split("-");
      return (y && m && d) ? `${d}/${m}/${y}` : dataISO;
    })();

    // data em cima + horário embaixo
    txtHorario.innerHTML = `${dataBR}<br>${textoHorario(hi, hf)}`;

    if (txtLocal) txtLocal.textContent = patrulha.local || "--";
    if (txtRevista) txtRevista.textContent = patrulha.revista || "--";

    txtPatrulha.textContent = `Patrulha ${patrulha.numero || "--"}`;

    txtCpp.textContent = patrulha.cpp || "--";
    txtMissao.textContent = patrulha.missao || "--";

    aplicarMapa(patrulha.mapa);

    renderizarComposicaoDaPatrulha(patrulha, pms);
  } catch (err) {
    console.error(err);
    mostrarMensagem("Falha ao carregar dados do Firebase. Verifique sua conexão e tente novamente.");
  }
})();

/* Voltar */
if (btnVoltar) {
  btnVoltar.addEventListener("click", () => {
    const re = normalizarRe(sessionStorage.getItem("opCarnaval_reAtual"));
    if (re) window.location.href = `escala.html?re=${encodeURIComponent(re)}`;
    else window.location.href = "index.html";
  });
}
