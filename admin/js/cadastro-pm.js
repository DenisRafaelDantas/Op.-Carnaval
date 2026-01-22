/* =========================
   Admin • Cadastro de PM (Criar/Editar) • Firestore
   ========================= */

import {
  lerUnidadesFS,
  lerPmPorReFS,
  salvarPmFS
} from "../../js/repositorio-firestore.js";

/* Elementos */
const formCadastroPm = document.getElementById("form-cadastro-pm");

const inputRe = document.getElementById("re");
const selectPostoGraduacao = document.getElementById("postoGraduacao");

const inputNomeCompleto = document.getElementById("nomeCompleto");
const inputNomeGuerra = document.getElementById("nomeGuerra");

const selectUnidade = document.getElementById("unidade");
const selectCompanhia = document.getElementById("companhia");

const btnCancelar = document.getElementById("btnCancelar");

/* Estado */
const params = new URLSearchParams(window.location.search);
const reEdicao = params.get("re");
const MODO_EDICAO = Boolean(reEdicao);

/* Cache local de unidades (para montar companhias e salvar unidadeNome) */
let unidadesCache = [];

/* =========================
   Utilitários
   ========================= */
function normalizarRe(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 6);
}
function reValido(valor) {
  return /^\d{6}$/.test(valor);
}
function algumNomeInformado() {
  return (
    inputNomeCompleto.value.trim().length > 0 ||
    inputNomeGuerra.value.trim().length > 0
  );
}
function aplicarErroNomes(ativar) {
  if (ativar) {
    inputNomeCompleto.classList.add("is-invalid");
    inputNomeGuerra.classList.add("is-invalid");
  } else {
    inputNomeCompleto.classList.remove("is-invalid");
    inputNomeGuerra.classList.remove("is-invalid");
  }
}

/* =========================
   Unidade / Companhia
   ========================= */
function bloquearCompanhia() {
  selectCompanhia.disabled = true;
  selectCompanhia.innerHTML =
    `<option value="" selected disabled>SELECIONE A COMPANHIA...</option>`;
  selectCompanhia.classList.remove("is-invalid");
}

async function carregarUnidades() {
  selectUnidade.innerHTML =
    `<option value="" selected disabled>SELECIONE A UNIDADE...</option>`;

  try {
    unidadesCache = await lerUnidadesFS();
  } catch (err) {
    console.error(err);
    unidadesCache = [];
  }

  if (unidadesCache.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "NENHUMA UNIDADE CADASTRADA";
    opt.disabled = true;
    selectUnidade.appendChild(opt);
    bloquearCompanhia();
    return;
  }

  unidadesCache
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"))
    .forEach((u) => {
      const opt = document.createElement("option");
      opt.value = String(u.id);
      opt.textContent = String(u.nome);
      selectUnidade.appendChild(opt);
    });

  bloquearCompanhia();
}

function carregarCompanhias(unidadeId) {
  const unidade = unidadesCache.find((u) => String(u.id) === String(unidadeId));

  bloquearCompanhia();
  if (!unidade) return;

  selectCompanhia.disabled = false;

  const cias = Array.isArray(unidade.cias) ? unidade.cias : [];
  if (cias.length === 0) {
    const opt = document.createElement("option");
    opt.value = "SEM CIA";
    opt.textContent = "SEM CIA";
    selectCompanhia.appendChild(opt);
    return;
  }

  cias.forEach((cia) => {
    const opt = document.createElement("option");
    opt.value = String(cia);
    opt.textContent = String(cia);
    selectCompanhia.appendChild(opt);
  });
}

/* =========================
   Modo edição
   ========================= */
async function aplicarModoEdicaoSeNecessario() {
  if (!MODO_EDICAO) return;

  const reNormalizado = normalizarRe(reEdicao);

  if (!reValido(reNormalizado)) {
    alert("RE inválido na URL para edição.");
    window.location.href = "pms.html";
    return;
  }

  let pm = null;
  try {
    pm = await lerPmPorReFS(reNormalizado);
  } catch (err) {
    console.error(err);
  }

  if (!pm) {
    alert(`Não encontrei PM cadastrado com RE ${reNormalizado}.`);
    window.location.href = "pms.html";
    return;
  }

  inputRe.value = String(pm.re || "");
  selectPostoGraduacao.value = String(pm.postoGraduacao || "");
  inputNomeCompleto.value = String(pm.nomeCompleto || "");
  inputNomeGuerra.value = String(pm.nomeGuerra || "");

  selectUnidade.value = String(pm.unidadeId || "");
  carregarCompanhias(selectUnidade.value);
  selectCompanhia.value = String(pm.companhia || "");

  inputRe.disabled = true;

  const btnSalvar = formCadastroPm.querySelector('button[type="submit"]');
  if (btnSalvar) btnSalvar.textContent = "Salvar alterações";
}

/* =========================
   Inicialização
   ========================= */
(async function init() {
  await carregarUnidades();
  await aplicarModoEdicaoSeNecessario();
})();

/* =========================
   Eventos
   ========================= */
inputRe.addEventListener("input", () => {
  if (MODO_EDICAO) return;
  inputRe.value = normalizarRe(inputRe.value);
  inputRe.classList.remove("is-invalid");
});

selectPostoGraduacao.addEventListener("change", () => {
  selectPostoGraduacao.classList.remove("is-invalid");
});

[inputNomeCompleto, inputNomeGuerra].forEach((campo) => {
  campo.addEventListener("input", () => {
    if (algumNomeInformado()) aplicarErroNomes(false);
  });
});

selectUnidade.addEventListener("change", () => {
  selectUnidade.classList.remove("is-invalid");
  carregarCompanhias(selectUnidade.value);
  selectCompanhia.value = "";
});

selectCompanhia.addEventListener("change", () => {
  selectCompanhia.classList.remove("is-invalid");
});

btnCancelar.addEventListener("click", () => {
  window.location.href = "pms.html";
});

formCadastroPm.addEventListener("submit", async (event) => {
  event.preventDefault();

  let ok = true;

  const reAtual = MODO_EDICAO ? String(inputRe.value) : normalizarRe(inputRe.value);

  if (!reValido(reAtual)) {
    inputRe.classList.add("is-invalid");
    ok = false;
  } else {
    inputRe.classList.remove("is-invalid");
  }

  if (!selectPostoGraduacao.value) {
    selectPostoGraduacao.classList.add("is-invalid");
    ok = false;
  } else {
    selectPostoGraduacao.classList.remove("is-invalid");
  }

  if (!algumNomeInformado()) {
    aplicarErroNomes(true);
    ok = false;
  } else {
    aplicarErroNomes(false);
  }

  if (!selectUnidade.value) {
    selectUnidade.classList.add("is-invalid");
    ok = false;
  } else {
    selectUnidade.classList.remove("is-invalid");
  }

  if (selectCompanhia.disabled || !selectCompanhia.value) {
    selectCompanhia.classList.add("is-invalid");
    ok = false;
  } else {
    selectCompanhia.classList.remove("is-invalid");
  }

  if (!ok) return;

  /* No modo cadastrar, impede duplicidade consultando Firestore direto */
  if (!MODO_EDICAO) {
    try {
      const existe = await lerPmPorReFS(reAtual);
      if (existe) {
        alert(`JÁ EXISTE UM PM COM O RE ${reAtual}`);
        inputRe.classList.add("is-invalid");
        return;
      }
    } catch (err) {
      console.error(err);
      alert("Falha ao validar duplicidade no Firebase.");
      return;
    }
  }

  const unidade = unidadesCache.find((u) => String(u.id) === String(selectUnidade.value));

  const dadosPm = {
    re: reAtual,
    postoGraduacao: selectPostoGraduacao.value,
    nomeCompleto: inputNomeCompleto.value.trim(),
    nomeGuerra: inputNomeGuerra.value.trim(),
    unidadeId: selectUnidade.value,
    unidadeNome: unidade ? String(unidade.nome) : "",
    companhia: selectCompanhia.value
  };

  try {
    if (MODO_EDICAO) {
      await salvarPmFS({
        ...dadosPm,
        atualizadoEm: new Date().toISOString()
      });

      alert(`PM ATUALIZADO:\n${dadosPm.postoGraduacao} ${dadosPm.re}`);
      window.location.href = "pms.html";
      return;
    }

    await salvarPmFS({
      ...dadosPm,
      criadoEm: new Date().toISOString()
    });

    alert(`PM CADASTRADO:\n${dadosPm.postoGraduacao} ${dadosPm.re}`);

    inputRe.value = "";
    selectPostoGraduacao.value = "";
    inputNomeCompleto.value = "";
    inputNomeGuerra.value = "";
    selectUnidade.value = "";
    bloquearCompanhia();

    inputRe.classList.remove("is-invalid");
    selectPostoGraduacao.classList.remove("is-invalid");
    aplicarErroNomes(false);
    selectUnidade.classList.remove("is-invalid");
  } catch (err) {
    console.error(err);
    alert("Não foi possível salvar o PM. Verifique se você está logado como admin.");
  }
});
