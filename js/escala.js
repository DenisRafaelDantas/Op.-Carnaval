/* =========================
   Escala • Tela do Policial (Firestore) • LISTA DE DATAS
   - Mostra só HOJE e futuras
   - Ordena por datas mais próximas primeiro
   - Normaliza chaves de data (YYYY-MM-DD / YYYY-M-D / DD/MM/YYYY)
   ========================= */

import { lerPatrulhasFS } from "./repositorio-firestore.js";

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

/* Normaliza chaves de data para ISO (YYYY-MM-DD) */
function normalizarDataParaISO(chave) {
  const s = String(chave || "").trim();

  // já está no padrão YYYY-MM-DD (ou YYYY-M-D)
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const yyyy = m[1];
    const mm = String(m[2]).padStart(2, "0");
    const dd = String(m[3]).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // padrão DD/MM/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // desconhecido: devolve como está (vai virar inválido no timestamp)
  return s;
}

/* Coleta datas em que o RE aparece em escalasPorData[data].composicaoRe */
function coletarDatasDoReEmPatrulhas(re, patrulhas) {
  const resultados = [];
  const reStr = String(re);

  (Array.isArray(patrulhas) ? patrulhas : []).forEach((p) => {
    const numero = String(p?.numero || "--");

    const escalasPorData = p?.escalasPorData;
    if (!escalasPorData || typeof escalasPorData !== "object") return;

    Object.entries(escalasPorData).forEach(([chaveData, escala]) => {
      const dataISO = normalizarDataParaISO(chaveData);

      const comp = Array.isArray(escala?.composicaoRe) ? escala.composicaoRe : [];
      const contemRe = comp.map(String).includes(reStr);

      if (contemRe) {
        resultados.push({
          dataISO,
          patrulhaNumero: numero
        });
      }
    });
  });

  return resultados;
}

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
    subt.textContent = `Patrulha ${item.patrulhaNumero}`;

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
    const patrulhas = await lerPatrulhasFS();

    // 🔎 debug rápido (abre o console e confere)
    console.log("[escala] RE:", re);
    console.log("[escala] patrulhas carregadas:", patrulhas?.length || 0);
    console.log("[escala] exemplo patrulha:", patrulhas?.[0]);

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
