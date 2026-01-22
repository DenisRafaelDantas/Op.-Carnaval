/* =========================
   Admin • Cadastro de PM (Criar/Editar)
   =========================
   Campos:
   - RE (6 dígitos, somente números) -> chave do PM
   - Posto/Graduação (obrigatório)
   - Nome Completo e/ou Nome de Guerra (ao menos um)
   - Unidade (select carregado do cadastro de unidades)
   - Companhia (select carregado conforme unidade)

   Modo:
   - CADASTRAR: abre sem parâmetro
   - EDITAR: abre com ?re=XXXXXX
   ========================= */

/* =========================
   Chaves do "banco" (mock)
   ========================= */
const CHAVE_UNIDADES = "opCarnaval_unidades";
const CHAVE_PMS = "opCarnaval_pms";

/* =========================
   Referências aos elementos
   ========================= */
const formCadastroPm = document.getElementById("form-cadastro-pm");

const inputRe = document.getElementById("re");
const selectPostoGraduacao = document.getElementById("postoGraduacao");

const inputNomeCompleto = document.getElementById("nomeCompleto");
const inputNomeGuerra = document.getElementById("nomeGuerra");

const selectUnidade = document.getElementById("unidade");
const selectCompanhia = document.getElementById("companhia");

const btnCancelar = document.getElementById("btnCancelar");

/* =========================
   Estado da tela (modo)
   ========================= */

/* RE vindo da URL indica modo edição */
const params = new URLSearchParams(window.location.search);
const reEdicao = params.get("re"); // ex.: "100210" (string)

/* Flag: true se estiver editando */
const MODO_EDICAO = Boolean(reEdicao);

/* =========================
   Utilitários
   ========================= */

/* Normaliza RE (somente números e 6 dígitos) */
function normalizarRe(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 6);
}

/* Valida RE */
function reValido(valor) {
  return /^\d{6}$/.test(valor);
}

/* Regra: ao menos um nome */
function algumNomeInformado() {
  return (
    inputNomeCompleto.value.trim().length > 0 ||
    inputNomeGuerra.value.trim().length > 0
  );
}

/* Aplica/Remove erro visual nos nomes */
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
   Leitura/Escrita (mock)
   ========================= */

function lerUnidades() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_UNIDADES) || "[]");
  return Array.isArray(dados) ? dados : [];
}

function lerPms() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_PMS) || "[]");
  return Array.isArray(dados) ? dados : [];
}

function salvarPms(lista) {
  localStorage.setItem(CHAVE_PMS, JSON.stringify(lista));
}

/* Busca PM pelo RE */
function buscarPmPorRe(re) {
  return lerPms().find((pm) => String(pm.re) === String(re));
}

/* Verifica se RE já existe (usado no modo cadastrar) */
function reJaCadastrado(re) {
  return lerPms().some((pm) => String(pm.re) === String(re));
}

/* Atualiza PM existente pelo RE (retorna true se atualizou) */
function atualizarPmPorRe(re, novosDados) {
  const lista = lerPms();
  const idx = lista.findIndex((pm) => String(pm.re) === String(re));

  if (idx === -1) return false;

  /* Mantém o RE como chave e troca o resto */
  lista[idx] = { ...lista[idx], ...novosDados, re: String(re) };

  salvarPms(lista);
  return true;
}

/* Cria PM novo */
function criarPm(pm) {
  const lista = lerPms();
  lista.push(pm);
  salvarPms(lista);
}

/* =========================
   Unidade / Companhia (selects)
   ========================= */

/* Reseta e bloqueia companhia */
function bloquearCompanhia() {
  selectCompanhia.disabled = true;
  selectCompanhia.innerHTML =
    `<option value="" selected disabled>SELECIONE A COMPANHIA...</option>`;
  selectCompanhia.classList.remove("is-invalid");
}

/* Carrega unidades no select */
function carregarUnidades() {
  const unidades = lerUnidades();

  selectUnidade.innerHTML =
    `<option value="" selected disabled>SELECIONE A UNIDADE...</option>`;

  if (unidades.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "NENHUMA UNIDADE CADASTRADA";
    opt.disabled = true;
    selectUnidade.appendChild(opt);
    bloquearCompanhia();
    return;
  }

  unidades
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"))
    .forEach((u) => {
      const opt = document.createElement("option");
      opt.value = String(u.id);
      opt.textContent = String(u.nome);
      selectUnidade.appendChild(opt);
    });

  bloquearCompanhia();
}

/* Carrega companhias da unidade selecionada */
function carregarCompanhias(unidadeId) {
  const unidade = lerUnidades().find((u) => String(u.id) === String(unidadeId));

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
   Modo edição: carregar dados
   ========================= */

function aplicarModoEdicaoSeNecessario() {
  if (!MODO_EDICAO) return;

  /* Normaliza o RE da URL */
  const reNormalizado = normalizarRe(reEdicao);

  /* Se RE inválido, avisa e volta */
  if (!reValido(reNormalizado)) {
    alert("RE inválido na URL para edição.");
    window.location.href = "pms.html";
    return;
  }

  /* Busca PM */
  const pm = buscarPmPorRe(reNormalizado);

  /* Se não existir, avisa e volta */
  if (!pm) {
    alert(`Não encontrei PM cadastrado com RE ${reNormalizado}.`);
    window.location.href = "pms.html";
    return;
  }

  /* Preenche campos */
  inputRe.value = String(pm.re || "");
  selectPostoGraduacao.value = String(pm.postoGraduacao || "");

  inputNomeCompleto.value = String(pm.nomeCompleto || "");
  inputNomeGuerra.value = String(pm.nomeGuerra || "");

  /* Unidade e companhia exigem ordem: setar unidade -> carregar companhias -> setar companhia */
  selectUnidade.value = String(pm.unidadeId || "");
  carregarCompanhias(selectUnidade.value);
  selectCompanhia.value = String(pm.companhia || "");

  /* Trava o RE para não alterar a chave */
  inputRe.disabled = true;

  /* Ajusta texto do botão "Salvar" (se existir) */
  const btnSalvar = formCadastroPm.querySelector('button[type="submit"]');
  if (btnSalvar) btnSalvar.textContent = "Salvar alterações";
}

/* =========================
   Inicialização
   ========================= */
(function init() {
  /* Carrega unidades primeiro (necessário para preencher selects) */
  carregarUnidades();

  /* Se estiver editando, carrega dados */
  aplicarModoEdicaoSeNecessario();
})();

/* =========================
   Eventos
   ========================= */

/* RE: normaliza enquanto digita (somente no modo cadastrar) */
inputRe.addEventListener("input", () => {
  /* Se estiver editando, RE está travado e não deve ser alterado */
  if (MODO_EDICAO) return;

  inputRe.value = normalizarRe(inputRe.value);
  inputRe.classList.remove("is-invalid");
});

/* Posto/Graduação */
selectPostoGraduacao.addEventListener("change", () => {
  selectPostoGraduacao.classList.remove("is-invalid");
});

/* Nomes */
[inputNomeCompleto, inputNomeGuerra].forEach((campo) => {
  campo.addEventListener("input", () => {
    if (algumNomeInformado()) aplicarErroNomes(false);
  });
});

/* Unidade */
selectUnidade.addEventListener("change", () => {
  selectUnidade.classList.remove("is-invalid");
  carregarCompanhias(selectUnidade.value);

  /* Ao trocar unidade, limpa companhia para evitar seleção inválida */
  selectCompanhia.value = "";
});

/* Companhia */
selectCompanhia.addEventListener("change", () => {
  selectCompanhia.classList.remove("is-invalid");
});

/* Cancelar */
btnCancelar.addEventListener("click", () => {
  /* No admin, faz sentido voltar para listagem de PMs */
  window.location.href = "pms.html";
});

/* Submit (criar ou editar) */
formCadastroPm.addEventListener("submit", (event) => {
  event.preventDefault();

  let ok = true;

  /* Define o RE que será usado (em edição vem do campo travado) */
  const reAtual = MODO_EDICAO ? String(inputRe.value) : normalizarRe(inputRe.value);

  /* Validação RE */
  if (!reValido(reAtual)) {
    inputRe.classList.add("is-invalid");
    ok = false;
  } else {
    inputRe.classList.remove("is-invalid");
  }

  /* Validação Posto */
  if (!selectPostoGraduacao.value) {
    selectPostoGraduacao.classList.add("is-invalid");
    ok = false;
  } else {
    selectPostoGraduacao.classList.remove("is-invalid");
  }

  /* Validação Nome */
  if (!algumNomeInformado()) {
    aplicarErroNomes(true);
    ok = false;
  } else {
    aplicarErroNomes(false);
  }

  /* Validação Unidade */
  if (!selectUnidade.value) {
    selectUnidade.classList.add("is-invalid");
    ok = false;
  } else {
    selectUnidade.classList.remove("is-invalid");
  }

  /* Validação Companhia */
  if (selectCompanhia.disabled || !selectCompanhia.value) {
    selectCompanhia.classList.add("is-invalid");
    ok = false;
  } else {
    selectCompanhia.classList.remove("is-invalid");
  }

  if (!ok) return;

  /* No modo cadastrar, impede duplicidade */
  if (!MODO_EDICAO && reJaCadastrado(reAtual)) {
    alert(`JÁ EXISTE UM PM COM O RE ${reAtual}`);
    inputRe.classList.add("is-invalid");
    return;
  }

  /* Busca unidade para salvar também o nome */
  const unidade = lerUnidades().find((u) => String(u.id) === String(selectUnidade.value));

  /* Dados a salvar */
  const dadosPm = {
    re: reAtual,
    postoGraduacao: selectPostoGraduacao.value,
    nomeCompleto: inputNomeCompleto.value.trim(),
    nomeGuerra: inputNomeGuerra.value.trim(),
    unidadeId: selectUnidade.value,
    unidadeNome: unidade ? String(unidade.nome) : "",
    companhia: selectCompanhia.value
  };

  /* Se estiver editando: atualiza; se não: cria */
  if (MODO_EDICAO) {
    const okAtualizou = atualizarPmPorRe(reAtual, {
      ...dadosPm,
      atualizadoEm: new Date().toISOString()
    });

    if (!okAtualizou) {
      alert("Falha ao atualizar: PM não encontrado.");
      return;
    }

    alert(`PM ATUALIZADO:\n${dadosPm.postoGraduacao} ${dadosPm.re}`);

    /* Volta para listagem após editar */
    window.location.href = "pms.html";
    return;
  }

  /* Modo cadastrar: cria */
  criarPm({
    ...dadosPm,
    criadoEm: new Date().toISOString()
  });

  alert(`PM CADASTRADO:\n${dadosPm.postoGraduacao} ${dadosPm.re}`);

  /* Limpa formulário */
  inputRe.value = "";
  selectPostoGraduacao.value = "";
  inputNomeCompleto.value = "";
  inputNomeGuerra.value = "";
  selectUnidade.value = "";
  bloquearCompanhia();

  /* Limpa erros */
  inputRe.classList.remove("is-invalid");
  selectPostoGraduacao.classList.remove("is-invalid");
  aplicarErroNomes(false);
  selectUnidade.classList.remove("is-invalid");
});
// Commit de verificação geral
