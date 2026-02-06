/* =========================================================
   Admin • Atualizar Patrulhas por Planilha (Excel)
   - Detecta a linha de cabeçalho (onde aparece "RE")
   - Cada "COP" em OBSERVAÇÃO inicia nova patrulha
   - GP vira discriminação de grupo do militar
   - Só vincula se PM existir (pms/{RE})
   - Não duplica: se já estiver, só atualiza grupos/comandante
   - Se acabar patrulha e ainda tiver PM, para e informa
   ========================================================= */

import {
  lerPatrulhasFS,
  lerPmsFS,
  // ✅ ajuste para o nome real do seu repositório:
  // precisa ser um update/merge no doc da patrulha
  atualizarPatrulhaFS
} from "../../js/repositorio-firestore.js";

/* Elementos */
const arquivoPlanilha = document.getElementById("arquivoPlanilha");
const dataAtualizacao = document.getElementById("dataAtualizacao");
const btnAtualizar = document.getElementById("btnAtualizar");
const btnLimpar = document.getElementById("btnLimpar");
const statusTexto = document.getElementById("statusTexto");
const logEl = document.getElementById("log");

/* Helpers */
function log(msg) {
  logEl.textContent += (logEl.textContent ? "\n" : "") + String(msg ?? "");
}

function limparLog() {
  logEl.textContent = "";
}

function normalizarRe(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 10);
}

function up(valor) {
  return String(valor || "").trim().toUpperCase();
}

function contemCOP(obs) {
  return up(obs).includes("COP");
}

function hojeISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function ordenarPorNumero(patrulhas) {
  return [...patrulhas].sort((a, b) =>
    String(a?.numero || "").localeCompare(String(b?.numero || ""), "pt-BR")
  );
}

/* =========================================================
   Lê Excel e devolve uma matriz (linhas x colunas)
   ========================================================= */
async function lerMatrizExcel(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // header:1 => matriz (array de arrays), preserva posições
  const matriz = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return Array.isArray(matriz) ? matriz : [];
}

/* =========================================================
   Encontra linha de cabeçalho (onde tem "RE" e "GP")
   Retorna { headerRowIndex, colRe, colGp, colObs }
   ========================================================= */
function detectarCabecalho(matriz) {
  for (let i = 0; i < matriz.length; i++) {
    const linha = matriz[i].map((v) => up(v));

    const colRe = linha.indexOf("RE");
    const colGp = linha.indexOf("GP");
    const colObs = linha.indexOf("OBSERVAÇÃO") >= 0 ? linha.indexOf("OBSERVAÇÃO") : linha.indexOf("OBSERVACAO");

    if (colRe >= 0 && colGp >= 0) {
      return {
        headerRowIndex: i,
        colRe,
        colGp,
        colObs: colObs >= 0 ? colObs : null
      };
    }
  }

  return null;
}

/* =========================================================
   Monta comandos a partir da matriz
   ========================================================= */
function montarComandos(matriz, headerInfo) {
  const { headerRowIndex, colRe, colGp, colObs } = headerInfo;
  const comandos = [];

  for (let r = headerRowIndex + 1; r < matriz.length; r++) {
    const row = matriz[r] || [];

    const re = normalizarRe(row[colRe]);
    if (!re) continue;

    const gp = String(row[colGp] ?? "").trim();
    const obs = colObs !== null ? String(row[colObs] ?? "") : "";

    comandos.push({
      linha: r + 1, // linha “humana” do Excel (1-based)
      re,
      gp,
      observacao: obs,
      ehComandante: contemCOP(obs)
    });
  }

  return comandos;
}

/* =========================================================
   Índice de PMs por RE (para validar existência)
   ========================================================= */
function indexarPmsPorRe(pms) {
  const map = new Map();
  (pms || []).forEach((pm) => {
    // como seu docId é RE, normalmente pm.re vem ok
    const re = normalizarRe(pm?.re);
    if (re) map.set(re, pm);
  });
  return map;
}

/* =========================================================
   Aplica vínculo no objeto patrulha (em memória)
   - mantém composicaoRe existente
   - grava comandanteRe
   - grava grupos[re] = gp
   ========================================================= */
function aplicarVinculo(patrulha, cmd) {
  const re = cmd.re;
  const gp = String(cmd.gp || "").trim();

  if (!Array.isArray(patrulha.composicaoRe)) patrulha.composicaoRe = [];
  if (typeof patrulha.gruposABC !== "object" || patrulha.gruposABC === null) patrulha.gruposABC = {};

  if (cmd.ehComandante) {
    patrulha.comandanteRe = re;
  }

  if (!patrulha.composicaoRe.includes(re)) {
    patrulha.composicaoRe.push(re);
  }

  // discriminação de grupo
  if (gp) patrulha.gruposABC[re] = gp;
}


/* =========================================================
   Execução principal
   ========================================================= */
async function executarAtualizacao() {
  limparLog();

  const file = arquivoPlanilha?.files?.[0] || null;
  const dataISO = String(dataAtualizacao?.value || "").trim();

  if (!file) {
    statusTexto.textContent = "Selecione uma planilha para continuar.";
    log("ERRO: Nenhuma planilha selecionada.");
    return;
  }
  if (!dataISO) {
    statusTexto.textContent = "Selecione a data para continuar.";
    log("ERRO: Nenhuma data selecionada.");
    return;
  }

  statusTexto.textContent = "Lendo planilha...";
  log(`Planilha: ${file.name}`);
  log(`Data selecionada: ${dataISO}`);

  // 1) ler matriz do excel
  const matriz = await lerMatrizExcel(file);
  if (!matriz.length) {
    statusTexto.textContent = "Planilha vazia ou inválida.";
    log("ERRO: Planilha sem dados.");
    return;
  }

  // 2) detectar cabeçalho
  const headerInfo = detectarCabecalho(matriz);
  if (!headerInfo) {
    statusTexto.textContent = "Não encontrei as colunas RE/GP na planilha.";
    log("ERRO: Cabeçalho não encontrado. Precisa ter colunas RE e GP.");
    return;
  }

  log(`Cabeçalho detectado na linha: ${headerInfo.headerRowIndex + 1}`);

  // 3) montar comandos
  const comandos = montarComandos(matriz, headerInfo);
  if (!comandos.length) {
    statusTexto.textContent = "Nenhum RE encontrado na planilha.";
    log("ERRO: Nenhum RE válido encontrado abaixo do cabeçalho.");
    return;
  }

  // 4) carregar dados Firebase
  statusTexto.textContent = "Carregando dados do Firebase...";
  log("Carregando PMs...");
  const pms = await lerPmsFS();
  const pmsPorRe = indexarPmsPorRe(pms);

  log("Carregando patrulhas...");
  const todasPatrulhas = await lerPatrulhasFS();
  const patrulhasDaData = ordenarPorNumero(
    (todasPatrulhas || []).filter((p) => String(p?.dataEscala || "").trim() === dataISO)
  );

  if (!patrulhasDaData.length) {
    statusTexto.textContent = "Nenhuma patrulha encontrada para a data selecionada.";
    log("ERRO: Não há patrulhas cadastradas nessa data.");
    return;
  }

  log(`Patrulhas encontradas na data: ${patrulhasDaData.length}`);

  // 5) distribuir por patrulhas, mudando quando aparece COP
  statusTexto.textContent = "Processando vínculos...";
  let idxPatrulhaAtual = -1;

  let totalVinculados = 0;
  let totalReInexistente = 0;
  let totalIgnorados = 0;

  const alteradas = new Map(); // id -> patrulhaAlterada

  for (const cmd of comandos) {
    if (!pmsPorRe.has(cmd.re)) {
      totalReInexistente++;
      log(`Linha ${cmd.linha}: RE ${cmd.re} NÃO cadastrado. (ignorado)`);
      continue;
    }

    if (cmd.ehComandante) {
      idxPatrulhaAtual++;

      if (idxPatrulhaAtual >= patrulhasDaData.length) {
        statusTexto.textContent = "Faltam patrulhas para continuar.";
        log("");
        log("PAROU: Não há mais patrulhas cadastradas para continuar a vinculação.");
        log("Ainda existem policiais na planilha para vincular.");
        log("Deseja criar mais patrulhas e rodar novamente?");
        return;
      }

      const p = patrulhasDaData[idxPatrulhaAtual];
      log("");
      log(`== Patrulha ${p?.numero || "--"} (id=${p?.id}) iniciada por COP RE ${cmd.re} ==`);
    }

    if (idxPatrulhaAtual < 0) {
      totalIgnorados++;
      log(`Linha ${cmd.linha}: RE ${cmd.re} antes do primeiro COP. (ignorado)`);
      continue;
    }

    const base = patrulhasDaData[idxPatrulhaAtual];
    const id = base?.id;
    if (!id) {
      statusTexto.textContent = "Falha: patrulha sem id.";
      log("ERRO: Patrulha sem id (docId).");
      return;
    }

    const patrulhaAtual = alteradas.get(id) || JSON.parse(JSON.stringify(base));

    const jaTinha = Array.isArray(patrulhaAtual.composicaoRe) && patrulhaAtual.composicaoRe.includes(cmd.re);

    aplicarVinculo(patrulhaAtual, cmd);
    alteradas.set(id, patrulhaAtual);

    totalVinculados++;
    log(`${jaTinha ? "ATUALIZOU" : "OK"}: RE ${cmd.re} (GP=${cmd.gp || "--"}${cmd.ehComandante ? " / COP" : ""})`);
  }

  // 6) gravar no Firestore (1 update por patrulha)
  statusTexto.textContent = "Gravando alterações no Firebase...";
  log("");
  log(`Patrulhas a atualizar: ${alteradas.size}`);

  for (const [id, p] of alteradas.entries()) {
    const payload = {
      composicaoRe: Array.isArray(p.composicaoRe) ? p.composicaoRe : [],
      gruposABC: (typeof p.gruposABC === "object" && p.gruposABC) ? p.gruposABC : {},
      // se você já usa comandanteRe no app (comandante vermelho), isso vai encaixar.
      comandanteRe: p.comandanteRe || ""
    };

    await atualizarPatrulhaFS(id, payload);
    log(`SALVO: Patrulha ${p?.numero || "--"} (id=${id})`);
  }

  statusTexto.textContent = "Atualização concluída.";
  log("");
  log("===== RESUMO =====");
  log(`Vinculados/atualizados: ${totalVinculados}`);
  log(`RE inexistente: ${totalReInexistente}`);
  log(`Ignorados (antes do 1º COP): ${totalIgnorados}`);
}

/* Eventos */
btnAtualizar?.addEventListener("click", async () => {
  btnAtualizar.disabled = true;
  try {
    await executarAtualizacao();
  } catch (err) {
    console.error(err);
    statusTexto.textContent = "Falha durante a atualização.";
    log("");
    log("ERRO: " + (err?.message || String(err)));
  } finally {
    btnAtualizar.disabled = false;
  }
});

btnLimpar?.addEventListener("click", () => {
  if (arquivoPlanilha) arquivoPlanilha.value = "";
  if (dataAtualizacao) dataAtualizacao.value = hojeISO();
  statusTexto.textContent = "Campos limpos. Selecione a planilha e a data para começar.";
  limparLog();
});

/* Inicial */
if (dataAtualizacao) dataAtualizacao.value = hojeISO();
