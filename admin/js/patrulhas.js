/* =========================
   Admin • Listagem de Patrulhas
   - Lê do Firestore: patrulhas
   - Exibe cards com: Editar + Vincular PM + Excluir
   ========================= */

import {
  lerPatrulhasFS,
  excluirPatrulhaFS
} from "../../js/repositorio-firestore.js";

/* Elementos da tela */
const listaPatrulhas = document.getElementById("listaPatrulhas");
const semPatrulhas = document.getElementById("semPatrulhas");

/* Renderiza a lista na tela (Firestore) */
async function renderizar() {
  listaPatrulhas.innerHTML = "";
  semPatrulhas.classList.add("d-none");

  let patrulhas = [];
  try {
    patrulhas = await lerPatrulhasFS();
  } catch (err) {
    console.error(err);
    semPatrulhas.classList.remove("d-none");
    semPatrulhas.textContent = "Falha ao carregar patrulhas do Firebase.";
    return;
  }

  if (patrulhas.length === 0) {
    semPatrulhas.classList.remove("d-none");
    return;
  }

  semPatrulhas.classList.add("d-none");

  /* Ordena por número (01, 02...) */
  patrulhas.sort((a, b) => String(a.numero || "").localeCompare(String(b.numero || ""), "pt-BR"));

  patrulhas.forEach((p) => {
    const id = p.id; // ID real do documento Firestore

    const card = document.createElement("div");
    card.className = "card mb-3";

    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h2 class="h6 mb-1">Patrulha ${p.numero || "--"}</h2>
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
                    data-numero="${encodeURIComponent(p.numero || "--")}">
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

/* Clique em Excluir (delegação robusta) */
listaPatrulhas.addEventListener("click", async (event) => {
  const alvo = event.target;

  const btn = (alvo instanceof Element)
    ? alvo.closest('button[data-acao="excluir-patrulha"]')
    : null;

  if (!btn) return;

  const id = decodeURIComponent(btn.getAttribute("data-id") || "");
  const numero = decodeURIComponent(btn.getAttribute("data-numero") || "--");

  if (!id) return;

  const confirmou = confirm(`Confirma excluir a Patrulha ${numero}?\nEssa ação não pode ser desfeita.`);
  if (!confirmou) return;

  try {
    await excluirPatrulhaFS(id);
    await renderizar();
  } catch (err) {
    console.error(err);
    alert("Não foi possível excluir a patrulha. Verifique se você está logado como admin.");
  }
});

/* Inicializa */
renderizar();
