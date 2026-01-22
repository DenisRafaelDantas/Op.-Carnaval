/* =========================
   Admin • Listagem de Unidades
   - Lê do localStorage: opCarnaval_unidades
   - Exibe cards com: Editar + Excluir
   ========================= */

const CHAVE_UNIDADES = "opCarnaval_unidades";

/* Elementos da tela */
const listaUnidades = document.getElementById("listaUnidades");
const semUnidades = document.getElementById("semUnidades");

/* Lê unidades do localStorage */
function lerUnidades() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_UNIDADES) || "[]");
  return Array.isArray(dados) ? dados : [];
}

/* Salva unidades no localStorage */
function salvarUnidades(lista) {
  localStorage.setItem(CHAVE_UNIDADES, JSON.stringify(lista));
}

/* Exclui unidade por ID */
function excluirUnidadePorId(id) {
  const lista = lerUnidades();

  /* Remove a unidade que tiver o id informado */
  const novaLista = lista.filter((u) => String(u.id) !== String(id));

  /* Persiste no localStorage */
  salvarUnidades(novaLista);
}

/* Renderiza lista */
function renderizar() {
  const unidades = lerUnidades();

  /* Limpa área */
  listaUnidades.innerHTML = "";

  /* Se estiver vazio, mostra mensagem */
  if (unidades.length === 0) {
    semUnidades.classList.remove("d-none");
    return;
  }

  semUnidades.classList.add("d-none");

  /* Ordena por nome */
  unidades.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

  /* Cria um card por unidade */
  unidades.forEach((u) => {
    const cias = Array.isArray(u.cias) ? u.cias.join(", ") : "";

    const card = document.createElement("div");
    card.className = "card mb-3";

    card.innerHTML = `
      <div class="card-body">
        <h2 class="h6 mb-1">${u.nome || "--"}</h2>

        <div class="text-body-secondary small">
          <strong>CIAs:</strong> ${cias || "Não informado"}
        </div>

        <div class="d-flex gap-2 mt-3">
          <!-- Editar unidade (reaproveita cadastro) -->
          <a class="btn btn-outline-primary btn-sm"
             href="cadastro-unidade.html?id=${encodeURIComponent(u.id || "")}">
            Editar
          </a>

          <!-- Excluir unidade -->
          <button type="button"
                  class="btn btn-outline-danger btn-sm"
                  data-acao="excluir-unidade"
                  data-id="${encodeURIComponent(u.id || "")}"
                  data-nome="${encodeURIComponent(u.nome || "")}">
            Excluir
          </button>
        </div>
      </div>
    `;

    listaUnidades.appendChild(card);
  });
}

/* Clique em Excluir (delegação robusta com closest) */
listaUnidades.addEventListener("click", (event) => {
  const alvo = event.target;

  /* Encontra o botão de excluir mesmo se clicar no texto */
  const btn = (alvo instanceof Element)
    ? alvo.closest('button[data-acao="excluir-unidade"]')
    : null;

  if (!btn) return;

  /* Lê dados do botão */
  const id = decodeURIComponent(btn.getAttribute("data-id") || "");
  const nome = decodeURIComponent(btn.getAttribute("data-nome") || "UNIDADE");

  if (!id) return;

  /* Confirmação */
  const confirmou = confirm(`Confirma excluir a unidade "${nome}"?\nEssa ação não pode ser desfeita.`);
  if (!confirmou) return;

  /* Exclui e re-renderiza */
  excluirUnidadePorId(id);
  renderizar();
});

/* Inicializa */
renderizar();
// Commit de verificação geral
