/* =========================
   Escala • Tela do Policial (Firestore) • LISTA DE DATAS
   - Modelo novo:
       patrulha.dataEscala (YYYY-MM-DD)
       patrulha.horarioInicio / patrulha.horarioFim
       patrulha.composicaoRe (lista de REs)
   - Mostra só HOJE e futuras
   - Ordena por datas mais próximas primeiro
   ========================= */

import { lerPatrulhasDoReFS } from "./repositorio-firestore.js";

/* Elementos */
const badgeRe = document.getElementById("badgeRe");
const mensagem = document.getElementById("mensagem");
const conteudo = document.getElementById("conteudo");
const listaDatas = document.getElementById("listaDatas");
const msgSemDatas = document.getElementById("msgSemDatas");
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

function hojeISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatarDataBR(iso) {
  const [y, m, d] = String(iso || "").split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/* Converte YYYY-MM-DD -> timestamp de meia-noite local */
function tsMeiaNoiteLocal(dataISO) {
  const [y, m, d] = String(dataISO || "").split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/* Normaliza data para ISO (defensivo) */
function normalizarDataParaISO(chave) {
  const s = String(chave || "").trim();

  // YYYY-MM-DD (ou YYYY-M-D)
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const yyyy = m[1];
    const mm = String(m[2]).padStart(2, "0");
    const dd = String(m[3]).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // DD/MM/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return s;
}

function textoHorario(hIni, hFim) {
  const a = String(hIni || "").trim();
  const b = String(hFim || "").trim();
  if (!a && !b) return "";
  if (a && b) return `${a} às ${b}`;
  if (a) return `${a} (início)`;
  return `${b} (término)`;
}

/* Coleta datas em que o RE aparece em patrulha.composicaoRe */
function coletarDatasDoReEmPatrulhas(re, patrulhas) {
  const resultados = [];
  const reStr = String(re);

  (Array.isArray(patrulhas) ? patrulhas : []).forEach((p) => {
    const dataISO = normalizarDataParaISO(p?.dataEscala);
    if (!dataISO) return;

    const comp = Array.isArray(p?.composicaoRe) ? p.composicaoRe : [];
    const contemRe = comp.map(String).includes(reStr);
    if (!contemRe) return;

    resultados.push({
      dataISO,
      patrulhaNumero: String(p?.numero || "--"),
      horarioInicio: String(p?.horarioInicio || ""),
      horarioFim: String(p?.horarioFim || "")
    });
  });

  return resultados;
}

/* Render da lista */
function renderizarLista(datas, re) {
  listaDatas.innerHTML = "";

  if (!datas || datas.length === 0) {
    msgSemDatas.textContent = "No momento, você não possui escalas futuras cadastradas.";
    msgSemDatas.classList.remove("d-none");
    return;
  }

  msgSemDatas.classList.add("d-none");

  const hoje = hojeISO();

  datas.forEach((item) => {
    const ehHoje = item.dataISO === hoje;

    const a = document.createElement("a");
    a.href = `operacao.html?re=${encodeURIComponent(re)}&data=${encodeURIComponent(item.dataISO)}`;
    a.className = "list-group-item list-group-item-action d-flex align-items-center justify-content-between";

    if (ehHoje) a.classList.add("border", "border-primary");

    const esquerda = document.createElement("div");
    esquerda.className = "d-flex flex-column";

    const topo = document.createElement("div");
    topo.className = "d-flex align-items-center gap-2 flex-wrap";

    const titulo = document.createElement("div");
    titulo.className = "fw-semibold";
    titulo.textContent = formatarDataBR(item.dataISO);

    topo.appendChild(titulo);

    if (ehHoje) {
      const pill = document.createElement("span");
      pill.className = "badge text-bg-primary";
      pill.textContent = "HOJE";
      topo.appendChild(pill);
    }

    const subt = document.createElement("div");
    subt.className = "text-body-secondary small";

    const horario = textoHorario(item.horarioInicio, item.horarioFim);
    subt.textContent = horario
      ? `Patrulha ${item.patrulhaNumero} • ${horario}`
      : `Patrulha ${item.patrulhaNumero}`;

    esquerda.appendChild(topo);
    esquerda.appendChild(subt);

    const seta = document.createElement("span");
    seta.className = "text-body-secondary";
    seta.textContent = "›";

    a.appendChild(esquerda);
    a.appendChild(seta);

    listaDatas.appendChild(a);
  });
}

/* Inicialização */
(async function init() {
  const params = new URLSearchParams(window.location.search);
  const reUrl = normalizarRe(params.get("re"));
  const reSessao = normalizarRe(sessionStorage.getItem("opCarnaval_reAtual"));
  const re = reUrl || reSessao;

  badgeRe.textContent = re ? `RE ${re}` : "RE --";

  if (!re) {
    mostrarMensagem("RE não informado. Volte para a tela inicial e digite seu RE.");
    return;
  }

  try {
    const patrulhas = await lerPatrulhasDoReFS(re);

    let datas = coletarDatasDoReEmPatrulhas(re, patrulhas);

    const hoje = hojeISO();
    const tHoje = tsMeiaNoiteLocal(hoje);

    // remove passadas + remove inválidas
    datas = datas.filter((item) => {
      const tData = tsMeiaNoiteLocal(item.dataISO);
      return Number.isFinite(tData) && tData >= tHoje;
    });

    // ordena por data (mais próximas primeiro)
    datas.sort((a, b) => tsMeiaNoiteLocal(a.dataISO) - tsMeiaNoiteLocal(b.dataISO));

    esconderMensagem();
    conteudo.classList.remove("d-none");
    renderizarLista(datas, re);
  } catch (err) {
    console.error(err);
    mostrarMensagem("Falha ao carregar dados do Firebase. Verifique sua conexão e tente novamente.");
  }
})();

/* Eventos */
if (btnVoltar) {
  btnVoltar.addEventListener("click", () => {
    sessionStorage.removeItem("opCarnaval_reAtual");
    window.location.href = "index.html";
  });
}
