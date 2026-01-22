/* =========================
   Admin • Vincular PM à Patrulha
   =========================
   Requisitos atendidos:
   - Campo horário início e término (salvo na patrulha)
   - Campo filtro por RE (6 dígitos, numérico)
   - Lista de PMs rolável, com checkbox para selecionar múltiplos
   - Filtra lista pelo RE digitado
   - Botão limpar para limpar o RE
   - Botão Adicionar: adiciona selecionados à composição da patrulha
   - Composição:
     - aparece ao lado no desktop
     - aparece acima no mobile (via Bootstrap order)
     - permite remover selecionados (checkbox) ou limpar tudo
   ========================= */

/* =========================
   Chaves do "banco" (mock)
   ========================= */
const CHAVE_PMS = "opCarnaval_pms";
const CHAVE_PATRULHAS = "opCarnaval_patrulhas";

/* =========================
   Captura parâmetros da URL
   ========================= */
const params = new URLSearchParams(window.location.search);
const idPatrulha = params.get("id"); // obrigatório

/* =========================
   Elementos da tela
   ========================= */
const badgePatrulha = document.getElementById("badgePatrulha");

const horaInicio = document.getElementById("horaInicio");
const horaFim = document.getElementById("horaFim");

const filtroRe = document.getElementById("filtroRe");
const btnLimparFiltro = document.getElementById("btnLimparFiltro");
const statusLista = document.getElementById("statusLista");

const listaPms = document.getElementById("listaPms");
const msgSemPms = document.getElementById("msgSemPms");

const listaComposicao = document.getElementById("listaComposicao");
const msgComposicaoVazia = document.getElementById("msgComposicaoVazia");

const btnAdicionar = document.getElementById("btnAdicionar");
const btnCancelar = document.getElementById("btnCancelar");
const btnSair = document.getElementById("btnSair");

const btnRemoverSelecionados = document.getElementById("btnRemoverSelecionados");
const btnLimparComposicao = document.getElementById("btnLimparComposicao");

/* =========================
   Leitura/Escrita no storage
   ========================= */

/* Lê PMs */
function lerPms() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_PMS) || "[]");
  return Array.isArray(dados) ? dados : [];
}

/* Lê patrulhas */
function lerPatrulhas() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_PATRULHAS) || "[]");
  return Array.isArray(dados) ? dados : [];
}

/* Salva patrulhas */
function salvarPatrulhas(lista) {
  localStorage.setItem(CHAVE_PATRULHAS, JSON.stringify(lista));
}

/* Busca patrulha por ID */
function buscarPatrulhaPorId(id) {
  return lerPatrulhas().find((p) => String(p.id) === String(id));
}

/* Atualiza patrulha por ID */
function atualizarPatrulhaPorId(id, novosDados) {
  const lista = lerPatrulhas();
  const idx = lista.findIndex((p) => String(p.id) === String(id));

  if (idx === -1) return false;

  lista[idx] = { ...lista[idx], ...novosDados, id: String(id) };
  salvarPatrulhas(lista);
  return true;
}

/* =========================
   Utilitários
   ========================= */

/* Normaliza RE (somente números, máximo 6) */
function normalizarRe(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 6);
}

/* Posto/graduação exibido */
function postoExibicao(pm) {
  return pm.postoGraduacao?.trim() || "POSTO NÃO INF.";
}

/* Nome curto para listar (prioriza nome de guerra, senão nome completo) */
function nomeExibicao(pm) {
  return (pm.nomeGuerra && pm.nomeGuerra.trim())
    ? pm.nomeGuerra.trim()
    : (pm.nomeCompleto && pm.nomeCompleto.trim())
      ? pm.nomeCompleto.trim()
      : "NOME NÃO INFORMADO";
}

/* Monta texto "RE - NOME" */
function textoPm(pm) {
  return `${postoExibicao(pm)} ${pm.re || "--"} ${nomeExibicao(pm)}`;
}

/* Garante estrutura de composição dentro da patrulha */
function obterComposicao(patrulha) {
  /* Usa array de REs */
  const lista = patrulha.composicaoRe;
  return Array.isArray(lista) ? lista : [];
}

/* Salva horários + composição na patrulha */
function salvarDadosPatrulha(hInicio, hFim, composicaoRe) {
  return atualizarPatrulhaPorId(idPatrulha, {
    horarioInicio: hInicio || "",
    horarioFim: hFim || "",
    composicaoRe: Array.isArray(composicaoRe) ? composicaoRe : [],
    atualizadoEm: new Date().toISOString()
  });
}

/* =========================
   Disponibilidade de PMs
   ========================= */

/* Retorna todas as patrulhas (para calcular quem já está alocado) */
function todasAsPatrulhas() {
  return lerPatrulhas();
}

/* Monta um Set com todos os REs que já estão em alguma patrulha */
function obterResEmUso() {
  const patrulhas = todasAsPatrulhas();
  const usados = new Set();

  patrulhas.forEach((p) => {
    const comp = Array.isArray(p.composicaoRe) ? p.composicaoRe : [];
    comp.forEach((re) => usados.add(String(re)));
  });

  return usados;
}

/* Mapa RE -> Patrulha (para dar mensagem quando o RE pesquisado está ocupado) */
function obterMapaReParaPatrulha() {
  const patrulhas = todasAsPatrulhas();
  const mapa = new Map();

  patrulhas.forEach((p) => {
    const comp = Array.isArray(p.composicaoRe) ? p.composicaoRe : [];
    comp.forEach((re) => {
      /* Guarda o número da patrulha onde está alocado */
      mapa.set(String(re), String(p.numero || "--"));
    });
  });

  return mapa;
}


/* =========================
   Estado em memória (tela)
   ========================= */
let patrulhaAtual = null;      // objeto da patrulha
let pms = [];                  // lista de PMs
let composicaoRe = [];         // array de REs já adicionados na patrulha

/* =========================
   Renderização • Lista de PMs
   ========================= */
function renderizarListaPms() {
  /* Limpa */
  listaPms.innerHTML = "";

  /* Se não houver PMs cadastrados */
  if (pms.length === 0) {
    msgSemPms.classList.remove("d-none");
    statusLista.textContent = "Nenhum PM cadastrado.";
    return;
  }

  msgSemPms.classList.add("d-none");

  /* Calcula quem já está em uso em alguma patrulha */
  const resEmUso = obterResEmUso();
  const mapaRePatrulha = obterMapaReParaPatrulha();

  /* Lista “disponível”: PM que NÃO está em nenhuma patrulha */
  let disponiveis = pms.filter((pm) => !resEmUso.has(String(pm.re)));

  /* Filtro por RE */
  const reFiltro = normalizarRe(filtroRe.value);

  if (reFiltro.length > 0) {
    /* Se digitou RE, tenta achar na lista disponível */
    disponiveis = disponiveis.filter((pm) => String(pm.re) === reFiltro);
    statusLista.textContent = `Filtrando por RE: ${reFiltro}`;
  } else {
    statusLista.textContent = "Mostrando apenas PMs disponíveis (não vinculados a nenhuma patrulha).";
  }

  /* Se não encontrou ninguém */
  if (disponiveis.length === 0) {
    const bloco = document.createElement("div");
    bloco.className = "text-body-secondary small";

    /* Se houver filtro e o PM estiver alocado em outra patrulha, informa */
    if (reFiltro.length === 6) {
      const patrulhaOndeEsta = mapaRePatrulha.get(reFiltro);

      if (patrulhaOndeEsta) {
        bloco.textContent = `RE ${reFiltro} já está vinculado à Patrulha ${patrulhaOndeEsta}.`;
      } else {
        bloco.textContent = "Nenhum PM disponível encontrado com esse RE.";
      }
    } else {
      bloco.textContent = "Nenhum PM disponível no momento.";
    }

    listaPms.appendChild(bloco);
    return;
  }

  /* Renderiza cada PM disponível */
  disponiveis.forEach((pm) => {
    const item = document.createElement("div");
    item.className = "d-flex align-items-center justify-content-between gap-2 py-2 border-bottom";

    const esquerda = document.createElement("div");
    esquerda.className = "d-flex align-items-center gap-2";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "form-check-input";
    check.id = `selPm_${pm.re}`;
    check.dataset.re = String(pm.re);

    const label = document.createElement("label");
    label.className = "form-check-label";
    label.setAttribute("for", check.id);
    label.textContent = textoPm(pm);

    esquerda.appendChild(check);
    esquerda.appendChild(label);

    item.appendChild(esquerda);
    listaPms.appendChild(item);
  });
}


/* =========================
   Renderização • Composição
   ========================= */
function renderizarComposicao() {
  /* Limpa */
  listaComposicao.innerHTML = "";

  /* Se vazio, mostra mensagem */
  if (composicaoRe.length === 0) {
    msgComposicaoVazia.classList.remove("d-none");
    return;
  }

  msgComposicaoVazia.classList.add("d-none");

  /* Para montar a composição com nomes, cria um map RE -> PM */
  const mapPms = new Map(pms.map((pm) => [String(pm.re), pm]));

  /* Renderiza cada RE */
  composicaoRe.forEach((re) => {
    const pm = mapPms.get(String(re));

    const item = document.createElement("div");
    item.className = "d-flex align-items-center gap-2 py-2 border-bottom";

    /* Checkbox para remover */
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "form-check-input";
    check.id = `remPm_${re}`;
    check.dataset.re = String(re);

    /* Texto */
    const texto = document.createElement("label");
    texto.className = "form-check-label";
    texto.setAttribute("for", check.id);

    if (pm) {
      texto.textContent = textoPm(pm);
    } else {
      /* Caso o PM tenha sido excluído do cadastro, ainda aparece como RE “órfão” */
      texto.textContent = `${re} - (PM não encontrado no cadastro)`;
    }

    item.appendChild(check);
    item.appendChild(texto);

    listaComposicao.appendChild(item);
  });
}

/* =========================
   Ações
   ========================= */

/* Adiciona selecionados da lista de PMs à composição */
function adicionarSelecionados() {
  /* Valida horários (mínimo: preenchido) */
  const hIni = String(horaInicio.value || "").trim();
  const hFim = String(horaFim.value || "").trim();

  let ok = true;

  if (!hIni) {
    horaInicio.classList.add("is-invalid");
    ok = false;
  } else {
    horaInicio.classList.remove("is-invalid");
  }

  if (!hFim) {
    horaFim.classList.add("is-invalid");
    ok = false;
  } else {
    horaFim.classList.remove("is-invalid");
  }

  if (!ok) return;

  /* Pega checks marcados na lista de PMs */
  const checks = listaPms.querySelectorAll('input[type="checkbox"][data-re]');
  const selecionados = [];

  checks.forEach((c) => {
    if (c.checked) selecionados.push(String(c.dataset.re));
  });

  /* Se nada selecionado */
  if (selecionados.length === 0) {
    alert("Selecione pelo menos um PM para adicionar.");
    return;
  }

  /* Adiciona evitando duplicidade */
  selecionados.forEach((re) => {
    if (!composicaoRe.includes(re)) composicaoRe.push(re);
  });

  /* Salva na patrulha */
  const salvou = salvarDadosPatrulha(hIni, hFim, composicaoRe);
  if (!salvou) {
    alert("Falha ao salvar: patrulha não encontrada.");
    return;
  }

  /* Atualiza interface */
  renderizarComposicao();
  renderizarListaPms();

  /* Limpa seleção (melhora operação) */
  checks.forEach((c) => (c.checked = false));

  alert("PM(s) adicionados à patrulha.");
}

/* Remove selecionados na composição */
function removerSelecionadosDaComposicao() {
  /* Pega checks marcados na composição */
  const checks = listaComposicao.querySelectorAll('input[type="checkbox"][data-re]');
  const remover = [];

  checks.forEach((c) => {
    if (c.checked) remover.push(String(c.dataset.re));
  });

  if (remover.length === 0) {
    alert("Selecione pelo menos um PM da composição para remover.");
    return;
  }

  /* Remove */
  composicaoRe = composicaoRe.filter((re) => !remover.includes(String(re)));

  /* Salva */
  const salvou = salvarDadosPatrulha(horaInicio.value, horaFim.value, composicaoRe);
  if (!salvou) {
    alert("Falha ao salvar: patrulha não encontrada.");
    return;
  }

  /* Atualiza UI */
  renderizarComposicao();
  renderizarListaPms();
}

/* Limpa toda a composição */
function limparComposicao() {
  const confirmou = confirm("Confirma remover TODOS os PMs da composição desta patrulha?");
  if (!confirmou) return;

  composicaoRe = [];

  const salvou = salvarDadosPatrulha(horaInicio.value, horaFim.value, composicaoRe);
  if (!salvou) {
    alert("Falha ao salvar: patrulha não encontrada.");
    return;
  }

  renderizarComposicao();
  renderizarListaPms();
}

/* Cancelar (limpa filtro e seleção) */
function cancelar() {
  /* Limpa filtro */
  filtroRe.value = "";

  /* Desmarca todos os checks da lista */
  const checks = listaPms.querySelectorAll('input[type="checkbox"][data-re]');
  checks.forEach((c) => (c.checked = false));

  /* Re-renderiza lista */
  renderizarListaPms();
}

/* Sair (volta para patrulhas) */
function sair() {
  window.location.href = "patrulhas.html";
}

/* =========================
   Inicialização
   ========================= */
(function init() {
  /* Se não vier id na URL, não tem como trabalhar */
  if (!idPatrulha) {
    alert("ID da patrulha não informado. Volte e tente novamente.");
    window.location.href = "patrulhas.html";
    return;
  }

  /* Carrega dados */
  pms = ordenarPmsPorAntiguidade(lerPms());


  patrulhaAtual = buscarPatrulhaPorId(idPatrulha);

  if (!patrulhaAtual) {
    alert("Patrulha não encontrada. Volte e tente novamente.");
    window.location.href = "patrulhas.html";
    return;
  }

  /* Mostra número da patrulha */
  badgePatrulha.textContent = `Patrulha ${patrulhaAtual.numero || "--"}`;

  /* Carrega horários se já existirem */
  if (patrulhaAtual.horarioInicio) horaInicio.value = patrulhaAtual.horarioInicio;
  if (patrulhaAtual.horarioFim) horaFim.value = patrulhaAtual.horarioFim;

  /* Carrega composição */
  composicaoRe = obterComposicao(patrulhaAtual).map(String);

  /* Renderizações iniciais */
  renderizarComposicao();
  renderizarListaPms();
})();

/* =========================
   Eventos
   ========================= */

/* Filtro RE: só número, 6 dígitos, filtra ao digitar */
filtroRe.addEventListener("input", () => {
  filtroRe.value = normalizarRe(filtroRe.value);
  renderizarListaPms();
});

/* Botão limpar filtro */
btnLimparFiltro.addEventListener("click", () => {
  filtroRe.value = "";
  renderizarListaPms();
});

/* Horários: remove erro visual ao mudar */
horaInicio.addEventListener("change", () => horaInicio.classList.remove("is-invalid"));
horaFim.addEventListener("change", () => horaFim.classList.remove("is-invalid"));

/* Botões inferiores */
btnAdicionar.addEventListener("click", adicionarSelecionados);
btnCancelar.addEventListener("click", cancelar);
btnSair.addEventListener("click", sair);

/* Ações da composição */
btnRemoverSelecionados.addEventListener("click", removerSelecionadosDaComposicao);
btnLimparComposicao.addEventListener("click", limparComposicao);
