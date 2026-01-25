/* =========================
   Admin • Cadastro de Unidade (Criar/Editar)
   =========================
   Campos:
   - Nome da unidade
   - Checkboxes: 1ª CIA ... 6ª CIA + FT/OP/CAEP

   Modo:
   - CADASTRAR: abre sem parâmetro
   - EDITAR: abre com ?id=xxxx
   ========================= */

import {
  lerUnidadesFS,
  lerUnidadePorIdFS,
  salvarUnidadeFS
} from "../../js/repositorio-firestore.js";

/* Elementos */
const formUnidade = document.getElementById("form-unidade");
const inputNomeUnidade = document.getElementById("nomeUnidade");
const btnCancelarUnidade = document.getElementById("btnCancelarUnidade");

/* Mensagem opcional */
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
  document.getElementById("aep"),
  document.getElementById("em")
];

/* =========================
   Estado (modo)
   ========================= */
const params = new URLSearchParams(window.location.search);
const idEdicao = params.get("id");      // ex.: "4bpmm"
const MODO_EDICAO = Boolean(idEdicao);

/* =========================
   Utilitários
   ========================= */

/* Obtém CIAs marcadas */
function obterCiasMarcadas() {
  return checksCia.filter((c) => c && c.checked).map((c) => c.value);
}

/* Marca checks conforme array de CIAs */
function marcarCias(cias) {
  const setCias = new Set((Array.isArray(cias) ? cias : []).map(String));
  checksCia.forEach((c) => {
    if (!c) return;
    c.checked = setCias.has(String(c.value));
  });
}

/* Gera ID a partir do nome */
function gerarIdPeloNome(nome) {
  return String(nome || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Verifica duplicidade de nome no Firestore (ignorando a própria unidade em edição) */
async function nomeUnidadeJaExisteFS(nome, idParaIgnorar = null) {
  const alvo = String(nome || "").trim().toLowerCase();
  const unidades = await lerUnidadesFS();

  return unidades.some((u) => {
    const mesmoNome = String(u.nome || "").trim().toLowerCase() === alvo;
    const naoEhAMesma = idParaIgnorar ? String(u.id) !== String(idParaIgnorar) : true;
    return mesmoNome && naoEhAMesma;
  });
}

/* =========================
   Modo edição: carregar dados
   ========================= */
async function aplicarModoEdicaoSeNecessario() {
  if (!MODO_EDICAO) return;

  let unidade = null;
  try {
    unidade = await lerUnidadePorIdFS(idEdicao);
  } catch (err) {
    console.error(err);
  }

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
}

/* =========================
   Inicialização
   ========================= */
(async function init() {
  await aplicarModoEdicaoSeNecessario();
})();

/* =========================
   Eventos
   ========================= */

/* Cancelar */
btnCancelarUnidade.addEventListener("click", () => {
  window.location.href = "unidades.html";
});

/* Submit (criar/editar) */
formUnidade.addEventListener("submit", async (event) => {
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


  if (erroCias) erroCias.classList.add("d-none");

  if (!ok) return;

  /* Evita duplicidade de nome (Firestore) */
  try {
    const jaExiste = await nomeUnidadeJaExisteFS(nome, MODO_EDICAO ? idEdicao : null);
    if (jaExiste) {
      alert("Já existe uma unidade cadastrada com este nome.");
      return;
    }
  } catch (err) {
    console.error(err);
    alert("Falha ao validar duplicidade no Firebase.");
    return;
  }

  try {
    /* EDITAR */
    if (MODO_EDICAO) {
      await salvarUnidadeFS({
        id: idEdicao,
        nome: nome,
        cias: cias,
        atualizadoEm: new Date().toISOString()
      });

      alert("Unidade atualizada com sucesso.");
      window.location.href = "unidades.html";
      return;
    }

    /* CADASTRAR */
    const id = gerarIdPeloNome(nome);

    const unidade = {
      id: id,
      nome: nome,
      cias: cias,
      criadoEm: new Date().toISOString()
    };

    await salvarUnidadeFS(unidade);

    alert("Unidade cadastrada com sucesso.");

    /* Limpa */
    inputNomeUnidade.value = "";
    checksCia.forEach((c) => {
      if (c) c.checked = false;
    });
  } catch (err) {
    console.error(err);
    alert("Não foi possível salvar a unidade. Verifique se você está logado como admin.");
  }
});
