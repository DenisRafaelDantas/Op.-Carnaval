/* =========================
   Admin • Listagem de Patrulhas
   - Filtra por dataEscala
   - Exibe: Patrulha 01 • 07/02/2026 • 11:00 às 19:00
   ========================= */

import {
  lerPatrulhasFS,
  excluirPatrulhaFS
} from "../../js/repositorio-firestore.js";

/* Elementos */
const listaPatrulhas = document.getElementById("listaPatrulhas");
const semPatrulhas = document.getElementById("semPatrulhas");

const filtroData = document.getElementById("filtroData");
const btnHoje = document.getElementById("btnHoje");
const btnLimparData = document.getElementById("btnLimparData");
const statusPatrulhas = document.getElementById("statusPatrulhas");

/* Estado */
let patrulhasCache = [];

/* Utilitários */
function hojeISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatarDataBR(iso) {
  const s = String(iso || "").trim();
  if (!s) return "--";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function textoHorario(hIni, hFim) {
  const a = String(hIni || "").trim();
  const b = String(hFim || "").trim();
  if (!a && !b) return "--";
  if (a && b) return `${a} às ${b}`;
  if (a) return `${a} (início)`;
  return `${b} (término)`;
}

/* Renderiza a lista na tela conforme o filtro */
function renderizarFiltrado() {
  listaPatrulhas.innerHTML = "";
  semPatrulhas.classList.add("d-none");

  const dataISO = String(filtroData?.value || "").trim();

  if (!Array.isArray(patrulhasCache) || patrulhasCache.length === 0) {
    statusPatrulhas.textContent = "Nenhuma patrulha cadastrada ainda.";
    semPatrulhas.classList.remove("d-none");
    return;
  }

  if (!dataISO) {
    statusPatrulhas.textContent = "Selecione uma data para listar as patrulhas.";
    semPatrulhas.classList.remove("d-none");
    semPatrulhas.textContent = "Selecione uma data para visualizar as patrulhas.";
    return;
  }

  let filtradas = patrulhasCache.filter((p) => String(p?.dataEscala || "").trim() === dataISO);

  statusPatrulhas.textContent = `Mostrando patrulhas de ${formatarDataBR(dataISO)}.`;

  if (filtradas.length === 0) {
    semPatrulhas.classList.remove("d-none");
    semPatrulhas.textContent = "Nenhuma patrulha cadastrada para esta data.";
    return;
  }

  /* Ordena por número (01, 02...) */
  filtradas.sort((a, b) => String(a.numero || "").localeCompare(String(b.numero || ""), "pt-BR"));

  filtradas.forEach((p) => {
    const id = p.id; // docId Firestore

    const numero = String(p.numero || "--");
    const data = String(p.dataEscala || "");
    const hIni = String(p.horarioInicio || "");
    const hFim = String(p.horarioFim || "");

    const titulo = `Patrulha ${numero} • ${formatarDataBR(data)} • ${textoHorario(hIni, hFim)}`;

    const card = document.createElement("div");
    card.className = "card mb-3";

    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h2 class="h6 mb-1">${titulo}</h2>
            <div class="text-body-secondary small">
              <strong>CPP:</strong> ${p.cpp ? p.cpp : "Não informado"}
            </div>
          </div>
        </div>

        <div class="text-body-secondary small mt-2">
          <strong>Missão:</strong> ${p.missao ? p.missao : "Não informada"}
        </div>

        <div class="d-flex justify-content-between align-items-center gap-2 mt-3 flex-wrap">
          <div class="d-flex gap-2">
            <a class="btn btn-outline-primary btn-sm"
               href="patrulha.html?id=${encodeURIComponent(id)}">
              Editar
            </a>

            <button type="button"
                    class="btn btn-outline-danger btn-sm"
                    data-acao="excluir-patrulha"
                    data-id="${encodeURIComponent(id)}"
                    data-numero="${encodeURIComponent(numero)}"
                    data-data="${encodeURIComponent(data)}">
              Excluir
            </button>
          </div>

          <div class="ms-auto">
            <a class="btn btn-primary btn-sm"
               href="vincular-pm.html?id=${encodeURIComponent(id)}">
              Vincular PM
            </a>
          </div>
        </div>
      </div>
    `;

    listaPatrulhas.appendChild(card);
  });
}

/* Carrega do Firestore */
async function carregarPatrulhas() {
  listaPatrulhas.innerHTML = "";
  semPatrulhas.classList.add("d-none");
  statusPatrulhas.textContent = "Carregando patrulhas do Firebase...";

  try {
    patrulhasCache = await lerPatrulhasFS();
  } catch (err) {
    console.error(err);
    patrulhasCache = [];
    semPatrulhas.classList.remove("d-none");
    semPatrulhas.textContent = "Falha ao carregar patrulhas do Firebase.";
    statusPatrulhas.textContent = "Falha ao carregar patrulhas do Firebase.";
    return;
  }

  renderizarFiltrado();
}

/* Clique em Excluir (delegação robusta) */
listaPatrulhas.addEventListener("click", async (event) => {
  const alvo = event.target;

  const btn = (alvo instanceof Element)
    ? alvo.closest('button[data-acao="excluir-patrulha"]')
    : null;

  if (!btn) return;

  const id = decodeURIComponent(btn.getAttribute("data-id") || "");
  const numero = decodeURIComponent(btn.getAttribute("data-numero") || "--");
  const data = decodeURIComponent(btn.getAttribute("data-data") || "");

  if (!id) return;

  const confirmou = confirm(`Confirma excluir a Patrulha ${numero} (${formatarDataBR(data)})?\nEssa ação não pode ser desfeita.`);
  if (!confirmou) return;

  try {
    await excluirPatrulhaFS(id);
    await carregarPatrulhas(); // recarrega do Firestore
  } catch (err) {
    console.error(err);
    alert("Não foi possível excluir a patrulha. Verifique se você está logado como admin.");
  }
});

/* Eventos do filtro */
if (filtroData) {
  filtroData.addEventListener("change", () => {
    renderizarFiltrado();
  });
}

if (btnHoje) {
  btnHoje.addEventListener("click", () => {
    if (!filtroData) return;
    filtroData.value = hojeISO();
    renderizarFiltrado();
  });
}

if (btnLimparData) {
  btnLimparData.addEventListener("click", () => {
    if (!filtroData) return;
    filtroData.value = "";
    renderizarFiltrado();
  });
}

/* Inicializa:
   - por padrão deixa HOJE selecionado (pra não parecer que "sumiu tudo")
*/
if (filtroData) filtroData.value = hojeISO();
carregarPatrulhas();
