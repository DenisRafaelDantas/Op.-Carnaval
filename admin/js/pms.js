/* =========================
   Admin • Listagem de PMs (Firestore)
   =========================
   - Lê do Firestore: pms
   - Exibe cards com: Editar + Excluir
   ========================= */

import { lerPmsFS, excluirPmPorReFS } from "../../js/repositorio-firestore.js";

/* Elementos da tela */
const listaPms = document.getElementById("listaPms");
const semPms = document.getElementById("semPms");

/* =========================
   Exibição
   ========================= */

/* Nome a exibir (prioriza nome de guerra) */
function nomeExibicao(pm) {
  return pm.nomeGuerra?.trim() || pm.nomeCompleto?.trim() || "NOME NÃO INFORMADO";
}

/* Posto/graduação exibido */
function postoExibicao(pm) {
  return pm.postoGraduacao?.trim() || "POSTO NÃO INF.";
}

/* Linha principal: "CAP PM 000000 BORDIM" */
function linhaPrincipal(pm) {
  return `${postoExibicao(pm)} ${pm.re || "--"} ${nomeExibicao(pm)}`;
}

/* (Se existir no seu projeto) Ordenação por antiguidade.
   Se não existir, cai no sort por posto+nome, sem quebrar.
*/
function ordenarSeguro(pms) {
  try {
    if (typeof ordenarPmsPorAntiguidade === "function") {
      return ordenarPmsPorAntiguidade(pms);
    }
  } catch (_) {}
  return [...pms].sort((a, b) => linhaPrincipal(a).localeCompare(linhaPrincipal(b), "pt-BR"));
}

/* =========================
   Renderização
   ========================= */
async function renderizar() {
  listaPms.innerHTML = "";
  semPms.classList.add("d-none");

  let pms = [];
  try {
    pms = await lerPmsFS();
  } catch (err) {
    console.error(err);
    semPms.classList.remove("d-none");
    semPms.textContent = "Falha ao carregar PMs do Firebase.";
    return;
  }

  const pmsOrdenados = ordenarSeguro(pms);

  if (pmsOrdenados.length === 0) {
    semPms.classList.remove("d-none");
    return;
  }

  semPms.classList.add("d-none");

  pmsOrdenados.forEach((pm) => {
    const card = document.createElement("div");
    card.className = "card mb-3";

    card.innerHTML = `
      <div class="card-body">
        <h2 class="h6 mb-1">${linhaPrincipal(pm)}</h2>

        <div class="text-body-secondary small">
          <strong>Unidade:</strong> ${pm.unidadeNome || "NÃO INFORMADO"}<br>
          <strong>Companhia:</strong> ${pm.companhia || "NÃO INFORMADO"}
        </div>

        <div class="d-flex gap-2 mt-3">
          <a class="btn btn-outline-primary btn-sm"
             href="cadastro-pm.html?re=${encodeURIComponent(pm.re || "")}">
            Editar
          </a>

          <button type="button"
                  class="btn btn-outline-danger btn-sm"
                  data-acao="excluir"
                  data-re="${encodeURIComponent(pm.re || "")}">
            Excluir
          </button>
        </div>
      </div>
    `;

    listaPms.appendChild(card);
  });
}

/* =========================
   Eventos
   ========================= */
listaPms.addEventListener("click", async (event) => {
  const alvo = event.target;

  const botaoExcluir = (alvo instanceof Element)
    ? alvo.closest('button[data-acao="excluir"]')
    : null;

  if (!botaoExcluir) return;

  const re = decodeURIComponent(botaoExcluir.getAttribute("data-re") || "");
  if (!re) return;

  const confirmou = confirm(`Confirma excluir o PM de RE ${re}?\nEssa ação não pode ser desfeita.`);
  if (!confirmou) return;

  try {
    await excluirPmPorReFS(re);
    await renderizar();
    alert(`PM ${re} excluído com sucesso.`);
  } catch (err) {
    console.error(err);
    alert("Não foi possível excluir. Verifique se você está logado como admin.");
  }
});

/* Inicializa */
renderizar();
