/* =========================
   Admin • Listagem de PMs
   =========================
   - Lê do localStorage: opCarnaval_pms
   - Exibe cards com: Editar + Excluir
   - Editar reutiliza a tela de cadastro:
     cadastro-pm.html?re=100210
   - Excluir remove do localStorage e re-renderiza
   ========================= */

/* Chave do "banco" de PMs (mock) */
const CHAVE_PMS = "opCarnaval_pms";

/* Elementos da tela */
const listaPms = document.getElementById("listaPms");
const semPms = document.getElementById("semPms");

/* =========================
   Leitura e escrita (mock)
   ========================= */

/* Lê PMs do localStorage */
function lerPms() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_PMS) || "[]");
  return Array.isArray(dados) ? dados : [];
}

/* Salva PMs no localStorage */
function salvarPms(lista) {
  localStorage.setItem(CHAVE_PMS, JSON.stringify(lista));
}

/* Exclui PM pelo RE */
function excluirPmPorRe(re) {
  const lista = lerPms();
  const novaLista = lista.filter((pm) => String(pm.re) !== String(re));
  salvarPms(novaLista);
}

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

/* Ordena por RE (simples e previsível) */
function ordenarPorRe(lista) {
  return [...lista].sort((a, b) => String(a.re || "").localeCompare(String(b.re || ""), "pt-BR"));
}

/* =========================
   Renderização
   ========================= */
function renderizar() {
  const pms = ordenarPmsPorAntiguidade(lerPms());

  /* Limpa área */
  listaPms.innerHTML = "";

  /* Se vazio, mostra mensagem */
  if (pms.length === 0) {
    semPms.classList.remove("d-none");
    return;
  }

  semPms.classList.add("d-none");

  /* Ordena */
  const pmsOrdenados = pms;

  /* Renderiza cards */
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
          <!-- Editar -->
          <a class="btn btn-outline-primary btn-sm"
             href="cadastro-pm.html?re=${encodeURIComponent(pm.re || "")}">
            Editar
          </a>

          <!-- Excluir -->
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
   Eventos (delegação robusta)
   ========================= */

/* Captura cliques dentro da lista e procura o botão mais próximo com data-acao="excluir" */
listaPms.addEventListener("click", (event) => {
  /* Garante que temos um elemento para usar closest() */
  const alvo = event.target;

  /* Procura o botão de excluir mesmo se o clique foi no texto dentro dele */
  const botaoExcluir = (alvo instanceof Element)
    ? alvo.closest('button[data-acao="excluir"]')
    : null;

  /* Se não clicou em excluir, ignora */
  if (!botaoExcluir) return;

  /* Obtém RE do data-re */
  const re = decodeURIComponent(botaoExcluir.getAttribute("data-re") || "");
  if (!re) return;

  /* Confirma */
  const confirmou = confirm(`Confirma excluir o PM de RE ${re}?\nEssa ação não pode ser desfeita.`);
  if (!confirmou) return;

  /* Exclui, re-renderiza e avisa */
  excluirPmPorRe(re);
  renderizar();
  alert(`PM ${re} excluído com sucesso.`);
});

/* Inicializa */
renderizar();
