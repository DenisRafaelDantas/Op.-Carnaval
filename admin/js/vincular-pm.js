/* =========================
   Admin • Vincular PM à Patrulha (Firestore) • POR DATA
   ========================= */

import {
  lerPmsFS,
  lerPatrulhasFS,
  lerPatrulhaPorIdFS,
  atualizarPatrulhaFS
} from "../../js/repositorio-firestore.js";

/* Parâmetros */
const params = new URLSearchParams(window.location.search);
const idPatrulha = params.get("id");

/* Elementos */
const badgePatrulha = document.getElementById("badgePatrulha");

const dataEscala = document.getElementById("dataEscala"); // ✅ novo
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

/* Utilitários */
function normalizarRe(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 6);
}

function postoExibicao(pm) {
  return pm.postoGraduacao?.trim() || "POSTO NÃO INF.";
}
function nomeExibicao(pm) {
  return (pm.nomeGuerra && pm.nomeGuerra.trim())
    ? pm.nomeGuerra.trim()
    : (pm.nomeCompleto && pm.nomeCompleto.trim())
      ? pm.nomeCompleto.trim()
      : "NOME NÃO INFORMADO";
}
function textoPm(pm) {
  return `${postoExibicao(pm)} ${pm.re || "--"} ${nomeExibicao(pm)}`;
}

/* Data (YYYY-MM-DD) */
function hojeISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function chaveDataSelecionada() {
  return String(dataEscala.value || "").trim();
}

/* Escalas por data dentro da patrulha */
function obterEscalasPorData(patrulha) {
  const e = patrulha?.escalasPorData;
  return (e && typeof e === "object") ? e : {};
}

function obterEscalaDaData(patrulha, dataISO) {
  const escalas = obterEscalasPorData(patrulha);
  const esc = escalas?.[dataISO];
  if (esc && typeof esc === "object") return esc;

  // compatibilidade com patrulhas antigas (sem escalasPorData):
  // se não existir nada por data, tenta usar os campos antigos apenas como "primeira carga"
  return null;
}

/* =========================
   Ordenação por antiguidade (Coronel -> Sd 2ª Cl)
   ========================= */

function normalizarPosto(texto) {
  return String(texto || "")
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PESO_POSTO = new Map([
  ["CEL", 100], ["CORONEL", 100],
  ["TC", 90], ["TEN CEL", 90], ["TENENTE CORONEL", 90], ["TEN-CEL", 90],
  ["MAJ", 80], ["MAJOR", 80],
  ["CAP", 70], ["CAPITAO", 70],
  ["1 TEN", 60], ["1º TEN", 60], ["1ºTEN", 60], ["PRIMEIRO TENENTE", 60], ["1TEN", 60],
  ["2 TEN", 50], ["2º TEN", 50], ["2ºTEN", 50], ["SEGUNDO TENENTE", 50], ["2TEN", 50],
  ["ASP", 45], ["ASP OF", 45], ["ASPIRANTE", 45], ["ASPIRANTE A OFICIAL", 45],
  ["ST", 40], ["SUBTENENTE", 40],
  ["1 SGT", 30], ["1º SGT", 30], ["1SGT", 30], ["PRIMEIRO SARGENTO", 30],
  ["2 SGT", 25], ["2º SGT", 25], ["2SGT", 25], ["SEGUNDO SARGENTO", 25],
  ["3 SGT", 20], ["3º SGT", 20], ["3SGT", 20], ["TERCEIRO SARGENTO", 20],
  ["CB", 10], ["CABO", 10],
  ["SD", 1], ["SOLDADO", 1],
  ["SD 2 CL", 0], ["SD 2ª CL", 0], ["SD 2A CL", 0], ["SOLDADO 2 CLASSE", 0], ["SOLDADO 2ª CLASSE", 0]
]);

function pesoPosto(pm) {
  const p = normalizarPosto(pm?.postoGraduacao);
  if (PESO_POSTO.has(p)) return PESO_POSTO.get(p);
  for (const [chave, peso] of PESO_POSTO.entries()) {
    if (p.startsWith(chave)) return peso;
  }
  return -1;
}

function ordenarPmsPorAntiguidade(lista) {
  return [...lista].sort((a, b) => {
    const pa = pesoPosto(a);
    const pb = pesoPosto(b);
    if (pb !== pa) return pb - pa;

    const rea = String(a.re || "");
    const reb = String(b.re || "");
    if (rea !== reb) return rea.localeCompare(reb, "pt-BR");

    const na = nomeExibicao(a);
    const nb = nomeExibicao(b);
    return na.localeCompare(nb, "pt-BR");
  });
}

/* Estado em memória */
let patrulhaAtual = null;
let pms = [];
let composicaoRe = [];
let patrulhasTodas = [];

/* =========================
   Persistência (Firestore) • POR DATA
   ========================= */
async function salvarDadosPatrulhaPorData(dataISO, hInicio, hFim, composicao) {
  if (!dataISO) throw new Error("Data não informada.");

  const payloadEscala = {
    horarioInicio: hInicio || "",
    horarioFim: hFim || "",
    composicaoRe: Array.isArray(composicao) ? composicao : [],
    atualizadoEm: new Date().toISOString()
  };

  // Atualiza no doc da patrulha em um MAP por data
  await atualizarPatrulhaFS(idPatrulha, {
    [`escalasPorData.${dataISO}`]: payloadEscala,

    // compatibilidade: mantém os campos "antigos" espelhados com a data selecionada
    horarioInicio: payloadEscala.horarioInicio,
    horarioFim: payloadEscala.horarioFim,
    composicaoRe: payloadEscala.composicaoRe,
    atualizadoEm: payloadEscala.atualizadoEm
  });

  // recarrega patrulhas para refletir disponibilidade por data
  patrulhasTodas = await lerPatrulhasFS();
  patrulhaAtual = await lerPatrulhaPorIdFS(idPatrulha);
}

/* =========================
   Disponibilidade por data
   ========================= */
function composicaoDaPatrulhaNaData(patrulha, dataISO) {
  const escalas = obterEscalasPorData(patrulha);
  const esc = escalas?.[dataISO];
  if (esc && Array.isArray(esc.composicaoRe)) return esc.composicaoRe.map(String);

  // fallback para patrulhas antigas (sem escalasPorData):
  // considera composicaoRe como se fosse "válida pra sempre" apenas se não houver escalasPorData
  const temEscalas = patrulha?.escalasPorData && typeof patrulha.escalasPorData === "object";
  if (!temEscalas) {
    const comp = Array.isArray(patrulha?.composicaoRe) ? patrulha.composicaoRe : [];
    return comp.map(String);
  }

  return [];
}

function obterResEmUsoNaData(dataISO) {
  const usados = new Set();

  patrulhasTodas.forEach((p) => {
    const comp = composicaoDaPatrulhaNaData(p, dataISO);
    comp.forEach((re) => usados.add(String(re)));
  });

  return usados;
}

function obterMapaReParaPatrulhaNaData(dataISO) {
  const mapa = new Map();

  patrulhasTodas.forEach((p) => {
    const comp = composicaoDaPatrulhaNaData(p, dataISO);
    comp.forEach((re) => {
      mapa.set(String(re), String(p.numero || "--"));
    });
  });

  return mapa;
}

/* =========================
   Renderização • Lista de PMs
   ========================= */
function renderizarListaPms() {
  listaPms.innerHTML = "";

  const dataISO = chaveDataSelecionada();

  if (!dataISO) {
    statusLista.textContent = "Selecione uma data para listar os PMs disponíveis.";
    return;
  }

  if (pms.length === 0) {
    msgSemPms.classList.remove("d-none");
    statusLista.textContent = "Nenhum PM cadastrado.";
    return;
  }

  msgSemPms.classList.add("d-none");

  const resEmUso = obterResEmUsoNaData(dataISO);
  const mapaRePatrulha = obterMapaReParaPatrulhaNaData(dataISO);

  // disponíveis = quem não está em nenhuma patrulha NAQUELA DATA
  let disponiveis = pms.filter((pm) => !resEmUso.has(String(pm.re)));

  // ordena por antiguidade
  disponiveis = ordenarPmsPorAntiguidade(disponiveis);

  const reFiltro = normalizarRe(filtroRe.value);

  if (reFiltro.length > 0) {
    disponiveis = disponiveis.filter((pm) => String(pm.re) === reFiltro);
    statusLista.textContent = `Data ${dataISO} • Filtrando por RE: ${reFiltro}`;
  } else {
    statusLista.textContent = `Data ${dataISO} • Mostrando apenas PMs disponíveis (não escalados em nenhuma patrulha nessa data).`;
  }

  if (disponiveis.length === 0) {
    const bloco = document.createElement("div");
    bloco.className = "text-body-secondary small";

    if (reFiltro.length === 6) {
      const patrulhaOndeEsta = mapaRePatrulha.get(reFiltro);
      bloco.textContent = patrulhaOndeEsta
        ? `Na data ${dataISO}, o RE ${reFiltro} já está vinculado à Patrulha ${patrulhaOndeEsta}.`
        : "Nenhum PM disponível encontrado com esse RE nessa data.";
    } else {
      bloco.textContent = "Nenhum PM disponível nessa data.";
    }

    listaPms.appendChild(bloco);
    return;
  }

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
  listaComposicao.innerHTML = "";

  if (composicaoRe.length === 0) {
    msgComposicaoVazia.classList.remove("d-none");
    return;
  }

  msgComposicaoVazia.classList.add("d-none");

  const mapPms = new Map(pms.map((pm) => [String(pm.re), pm]));

  composicaoRe.forEach((re) => {
    const pm = mapPms.get(String(re));

    const item = document.createElement("div");
    item.className = "d-flex align-items-center gap-2 py-2 border-bottom";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "form-check-input";
    check.id = `remPm_${re}`;
    check.dataset.re = String(re);

    const texto = document.createElement("label");
    texto.className = "form-check-label";
    texto.setAttribute("for", check.id);
    texto.textContent = pm ? textoPm(pm) : `${re} - (PM não encontrado no cadastro)`;

    item.appendChild(check);
    item.appendChild(texto);

    listaComposicao.appendChild(item);
  });
}

/* =========================
   Carregar/Aplicar dados da DATA selecionada
   ========================= */
function aplicarEscalaNaTela(escala) {
  if (escala) {
    horaInicio.value = escala.horarioInicio || "";
    horaFim.value = escala.horarioFim || "";
    composicaoRe = Array.isArray(escala.composicaoRe) ? escala.composicaoRe.map(String) : [];
  } else {
    // sem escala cadastrada nessa data -> limpa
    horaInicio.value = "";
    horaFim.value = "";
    composicaoRe = [];
  }

  renderizarComposicao();
  renderizarListaPms();
}

function carregarDadosDaDataSelecionada() {
  const dataISO = chaveDataSelecionada();
  if (!dataISO) return;

  const escala = obterEscalaDaData(patrulhaAtual, dataISO);

  // fallback: se não tem escala por data ainda, mas tem campos antigos preenchidos,
  // aplica como "primeira carga" (sem gravar) só pra não aparecer vazio
  if (!escala) {
    const temEscalas = patrulhaAtual?.escalasPorData && typeof patrulhaAtual.escalasPorData === "object";
    if (!temEscalas && (patrulhaAtual?.horarioInicio || patrulhaAtual?.horarioFim || Array.isArray(patrulhaAtual?.composicaoRe))) {
      aplicarEscalaNaTela({
        horarioInicio: patrulhaAtual.horarioInicio || "",
        horarioFim: patrulhaAtual.horarioFim || "",
        composicaoRe: Array.isArray(patrulhaAtual.composicaoRe) ? patrulhaAtual.composicaoRe : []
      });
      return;
    }
  }

  aplicarEscalaNaTela(escala);
}

/* =========================
   Ações
   ========================= */
async function adicionarSelecionados() {
  const dataISO = chaveDataSelecionada();

  let ok = true;

  if (!dataISO) { dataEscala.classList.add("is-invalid"); ok = false; }
  else dataEscala.classList.remove("is-invalid");

  const hIni = String(horaInicio.value || "").trim();
  const hFim = String(horaFim.value || "").trim();

  if (!hIni) { horaInicio.classList.add("is-invalid"); ok = false; }
  else horaInicio.classList.remove("is-invalid");

  if (!hFim) { horaFim.classList.add("is-invalid"); ok = false; }
  else horaFim.classList.remove("is-invalid");

  if (!ok) return;

  const checks = listaPms.querySelectorAll('input[type="checkbox"][data-re]');
  const selecionados = [];

  checks.forEach((c) => {
    if (c.checked) selecionados.push(String(c.dataset.re));
  });

  if (selecionados.length === 0) {
    alert("Selecione pelo menos um PM para adicionar.");
    return;
  }

  selecionados.forEach((re) => {
    if (!composicaoRe.includes(re)) composicaoRe.push(re);
  });

  try {
    await salvarDadosPatrulhaPorData(dataISO, hIni, hFim, composicaoRe);

    // ao salvar, recarrega/repinta por segurança
    carregarDadosDaDataSelecionada();

    checks.forEach((c) => (c.checked = false));
    alert("PM(s) adicionados à patrulha nessa data.");
  } catch (err) {
    console.error(err);
    alert("Falha ao salvar no Firebase. Verifique se você está logado como admin.");
  }
}

async function removerSelecionadosDaComposicao() {
  const dataISO = chaveDataSelecionada();

  if (!dataISO) {
    dataEscala.classList.add("is-invalid");
    alert("Selecione uma data para alterar a composição.");
    return;
  }
  dataEscala.classList.remove("is-invalid");

  const checks = listaComposicao.querySelectorAll('input[type="checkbox"][data-re]');
  const remover = [];

  checks.forEach((c) => {
    if (c.checked) remover.push(String(c.dataset.re));
  });

  if (remover.length === 0) {
    alert("Selecione pelo menos um PM da composição para remover.");
    return;
  }

  composicaoRe = composicaoRe.filter((re) => !remover.includes(String(re)));

  try {
    await salvarDadosPatrulhaPorData(dataISO, horaInicio.value, horaFim.value, composicaoRe);
    carregarDadosDaDataSelecionada();
  } catch (err) {
    console.error(err);
    alert("Falha ao salvar no Firebase. Verifique se você está logado como admin.");
  }
}

function cancelar() {
  filtroRe.value = "";
  const checks = listaPms.querySelectorAll('input[type="checkbox"][data-re]');
  checks.forEach((c) => (c.checked = false));
  renderizarListaPms();
}

function sair() {
  window.location.href = "patrulhas.html";
}

/* =========================
   Inicialização
   ========================= */
(async function init() {
  if (!idPatrulha) {
    alert("ID da patrulha não informado. Volte e tente novamente.");
    window.location.href = "patrulhas.html";
    return;
  }

  try {
    pms = await lerPmsFS();
    patrulhasTodas = await lerPatrulhasFS();
    patrulhaAtual = await lerPatrulhaPorIdFS(idPatrulha);

    if (!patrulhaAtual) {
      alert("Patrulha não encontrada. Volte e tente novamente.");
      window.location.href = "patrulhas.html";
      return;
    }

    badgePatrulha.textContent = `Patrulha ${patrulhaAtual.numero || "--"}`;

    // ✅ seta data padrão = hoje
    dataEscala.value = hojeISO();

    // carrega dados da data
    carregarDadosDaDataSelecionada();
  } catch (err) {
    console.error(err);
    alert("Falha ao carregar dados do Firebase. Verifique sua conexão e se está logado como admin.");
    window.location.href = "patrulhas.html";
  }
})();

/* =========================
   Eventos
   ========================= */
dataEscala.addEventListener("change", async () => {
  dataEscala.classList.remove("is-invalid");

  // para garantir disponibilidade atualizada (caso outra patrulha tenha sido salva em outra aba)
  try {
    patrulhasTodas = await lerPatrulhasFS();
    patrulhaAtual = await lerPatrulhaPorIdFS(idPatrulha);
  } catch (e) {
    console.warn("Falha ao recarregar dados ao trocar data:", e);
  }

  // limpa filtro e recarrega tela para a data nova
  filtroRe.value = "";
  carregarDadosDaDataSelecionada();
});

filtroRe.addEventListener("input", () => {
  filtroRe.value = normalizarRe(filtroRe.value);
  renderizarListaPms();
});

btnLimparFiltro.addEventListener("click", () => {
  filtroRe.value = "";
  renderizarListaPms();
});

horaInicio.addEventListener("change", () => horaInicio.classList.remove("is-invalid"));
horaFim.addEventListener("change", () => horaFim.classList.remove("is-invalid"));

btnAdicionar.addEventListener("click", adicionarSelecionados);
btnCancelar.addEventListener("click", cancelar);
btnSair.addEventListener("click", sair);

btnRemoverSelecionados.addEventListener("click", removerSelecionadosDaComposicao);
