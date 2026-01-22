/* =========================
   Admin • Listagem de Patrulhas
   - Lê do localStorage: opCarnaval_patrulhas
   - Exibe cards com: Editar + Vincular PM + Excluir
   ========================= */

/* Chave do "banco" de patrulhas (mock) */
const CHAVE_PATRULHAS = "opCarnaval_patrulhas";

/* Elementos da tela */
const listaPatrulhas = document.getElementById("listaPatrulhas");
const semPatrulhas = document.getElementById("semPatrulhas");

/* Lê patrulhas do localStorage */
function lerPatrulhas() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_PATRULHAS) || "[]");
  return Array.isArray(dados) ? dados : [];
}

/* Salva patrulhas no localStorage */
function salvarPatrulhas(lista) {
  localStorage.setItem(CHAVE_PATRULHAS, JSON.stringify(lista));
}

/* Exclui patrulha por id */
function excluirPatrulhaPorId(id) {
  const lista = lerPatrulhas();

  /* Remove a patrulha que tiver o id informado */
  const novaLista = lista.filter((p) => String(obterIdPatrulha(p)) !== String(id));

  /* Persiste no localStorage */
  salvarPatrulhas(novaLista);
}

/* Cria um ID estável para patrulha caso não exista (fallback) */
function obterIdPatrulha(p) {
  /* Preferência: se já tiver id, usa */
  if (p.id) return String(p.id);

  /* Fallback: usa número + cpp + criadoEm (bom o suficiente no mock) */
  const base = `${p.numero || ""}-${p.cpp || ""}-${p.criadoEm || ""}`;
  return btoa(unescape(encodeURIComponent(base))).slice(0, 16);
}

/* Renderiza a lista na tela */
function renderizar() {
  const patrulhas = lerPatrulhas();

  /* Limpa área */
  listaPatrulhas.innerHTML = "";

  /* Se estiver vazio, mostra mensagem */
  if (patrulhas.length === 0) {
    semPatrulhas.classList.remove("d-none");
    return;
  }

  semPatrulhas.classList.add("d-none");

  /* Ordena por número (01, 02, 03...) */
  patrulhas.sort((a, b) => String(a.numero || "").localeCompare(String(b.numero || ""), "pt-BR"));

  /* Cria um card por patrulha */
  patrulhas.forEach((p) => {
    const id = obterIdPatrulha(p);

    /* Card externo */
    const card = document.createElement("div");
    card.className = "card mb-3";

    /* Conteúdo do card */
    card.innerHTML = `
      <div class="card-body">
        <!-- Título com número -->
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div>
            <h2 class="h6 mb-1">Patrulha ${p.numero || "--"}</h2>
            <div class="text-body-secondary small">
              <strong>CPP:</strong> ${p.cpp ? p.cpp : "Não informado"}
            </div>
          </div>
        </div>

        <!-- Missão (resumo) -->
        <div class="text-body-secondary small mt-2">
          <strong>Missão:</strong> ${p.missao ? p.missao : "Não informada"}
        </div>

        <!-- Botões de ação -->
<div class="d-flex justify-content-between align-items-center gap-2 mt-3 flex-wrap">
  
  <!-- Grupo da esquerda: Editar + Excluir -->
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

  <!-- Grupo da direita: Vincular PM -->
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
listaPatrulhas.addEventListener("click", (event) => {
  const alvo = event.target;

  /* Encontra o botão de excluir mesmo se clicar no texto */
  const btn = (alvo instanceof Element)
    ? alvo.closest('button[data-acao="excluir-patrulha"]')
    : null;

  if (!btn) return;

  const id = decodeURIComponent(btn.getAttribute("data-id") || "");
  const numero = decodeURIComponent(btn.getAttribute("data-numero") || "--");

  if (!id) return;

  /* Confirmação */
  const confirmou = confirm(`Confirma excluir a Patrulha ${numero}?\nEssa ação não pode ser desfeita.`);
  if (!confirmou) return;

  /* Exclui e re-renderiza */
  excluirPatrulhaPorId(id);
  renderizar();
});

/* Inicializa renderização ao abrir a página */
renderizar();
// Commit de verificação geral
