/* =========================
   Admin • Cadastro de Unidade (Criar/Editar)
   =========================
   Campos:
   - Nome da unidade
   - Checkboxes: 1ª CIA ... 6ª CIA (lista de CIAs da unidade)

   Modo:
   - CADASTRAR: abre sem parâmetro
   - EDITAR: abre com ?id=xxxx
   ========================= */

/* Chave do "banco" (mock) */
const CHAVE_UNIDADES = "opCarnaval_unidades";

/* Elementos */
const formUnidade = document.getElementById("form-unidade");
const inputNomeUnidade = document.getElementById("nomeUnidade");
const btnCancelarUnidade = document.getElementById("btnCancelarUnidade");

/* Mensagem opcional (mantida, mas não obrigatória) */
const erroCias = document.getElementById("erroCias");

/* Checkboxes de CIA */
const checksCia = [
  document.getElementById("cia1"),
  document.getElementById("cia2"),
  document.getElementById("cia3"),
  document.getElementById("cia4"),
  document.getElementById("cia5"),
  document.getElementById("cia6"),
  document.getElementById("ciaft"),
  document.getElementById("ciaop"),
  document.getElementById("caep")
];

/* =========================
   Estado (modo)
   ========================= */
const params = new URLSearchParams(window.location.search);
const idEdicao = params.get("id");      // ex.: "4bpmm"
const MODO_EDICAO = Boolean(idEdicao);  // true se tem id

/* =========================
   Funções utilitárias
   ========================= */

/* Lê unidades do localStorage */
function lerUnidades() {
  const unidades = JSON.parse(localStorage.getItem(CHAVE_UNIDADES) || "[]");
  return Array.isArray(unidades) ? unidades : [];
}

/* Salva unidades no localStorage */
function salvarUnidades(unidades) {
  localStorage.setItem(CHAVE_UNIDADES, JSON.stringify(unidades));
}

/* Obtém CIAs marcadas */
function obterCiasMarcadas() {
  return checksCia.filter((c) => c.checked).map((c) => c.value);
}

/* Marca checks conforme array de CIAs */
function marcarCias(cias) {
  const setCias = new Set((Array.isArray(cias) ? cias : []).map(String));
  checksCia.forEach((c) => {
    c.checked = setCias.has(String(c.value));
  });
}

/* Busca unidade por id */
function buscarUnidadePorId(id) {
  return lerUnidades().find((u) => String(u.id) === String(id));
}

/* Verifica duplicidade de nome (ignorando a própria unidade em edição) */
function nomeUnidadeJaExiste(nome, idParaIgnorar = null) {
  const alvo = String(nome || "").trim().toLowerCase();
  return lerUnidades().some((u) => {
    const mesmoNome = String(u.nome || "").trim().toLowerCase() === alvo;
    const naoEhAMesma = idParaIgnorar ? String(u.id) !== String(idParaIgnorar) : true;
    return mesmoNome && naoEhAMesma;
  });
}

/* Atualiza unidade por id (retorna true se atualizou) */
function atualizarUnidadePorId(id, novosDados) {
  const lista = lerUnidades();
  const idx = lista.findIndex((u) => String(u.id) === String(id));

  if (idx === -1) return false;

  lista[idx] = { ...lista[idx], ...novosDados, id: String(id) };
  salvarUnidades(lista);
  return true;
}

/* Cria unidade nova (id já vem do seu cadastro) */
function criarUnidade(unidade) {
  const lista = lerUnidades();
  lista.push(unidade);
  salvarUnidades(lista);
}

/* =========================
   Modo edição: carregar dados
   ========================= */
function aplicarModoEdicaoSeNecessario() {
  if (!MODO_EDICAO) return;

  const unidade = buscarUnidadePorId(idEdicao);

  if (!unidade) {
    alert("Unidade não encontrada para edição.");
    window.location.href = "unidades.html";
    return;
  }

  /* Preenche campos */
  inputNomeUnidade.value = String(unidade.nome || "");
  marcarCias(unidade.cias || []);

  /* Ajusta texto do botão submit */
  const btnSalvar = formUnidade.querySelector('button[type="submit"]');
  if (btnSalvar) btnSalvar.textContent = "Salvar alterações";

  /* Em edição, recomendo travar o nome? (você decide)
     Vou deixar editável, mas se quiser travar, descomente:
     inputNomeUnidade.disabled = true;
  */
}

/* =========================
   Inicialização
   ========================= */
(function init() {
  aplicarModoEdicaoSeNecessario();
})();

/* =========================
   Eventos
   ========================= */

/* Cancelar */
btnCancelarUnidade.addEventListener("click", () => {
  window.location.href = "unidades.html";
});

/* Submit (criar/editar) */
formUnidade.addEventListener("submit", (event) => {
  event.preventDefault();

  const nome = inputNomeUnidade.value.trim();
  const cias = obterCiasMarcadas();

  let ok = true;

  /* Validação do nome */
  if (!nome) {
    inputNomeUnidade.classList.add("is-invalid");
    ok = false;
  } else {
    inputNomeUnidade.classList.remove("is-invalid");
  }

  /* Se quiser exigir ao menos uma CIA, ative aqui:
  if (cias.length === 0) {
    erroCias.classList.remove("d-none");
    ok = false;
  } else {
    erroCias.classList.add("d-none");
  }
  */
  if (erroCias) erroCias.classList.add("d-none");

  if (!ok) return;

  /* Evita duplicidade de nome */
  if (nomeUnidadeJaExiste(nome, MODO_EDICAO ? idEdicao : null)) {
    alert("Já existe uma unidade cadastrada com este nome.");
    return;
  }

  /* Se editar */
  if (MODO_EDICAO) {
    const atualizou = atualizarUnidadePorId(idEdicao, {
      nome: nome,
      cias: cias,
      atualizadoEm: new Date().toISOString()
    });

    if (!atualizou) {
      alert("Falha ao atualizar (unidade não encontrada).");
      return;
    }

    alert("Unidade atualizada com sucesso.");
    window.location.href = "unidades.html";
    return;
  }

  /* Se cadastrar: mantém o seu padrão de id (derivado do nome) */
  const id = nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  /* Monta unidade */
  const unidade = {
    id: id,
    nome: nome,
    cias: cias,
    criadoEm: new Date().toISOString()
  };

  /* Salva */
  criarUnidade(unidade);

  alert("Unidade cadastrada com sucesso.");

  /* Limpa */
  inputNomeUnidade.value = "";
  checksCia.forEach((c) => (c.checked = false));
});
// Commit de verificação geral
