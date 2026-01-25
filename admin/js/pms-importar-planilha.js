// js/pms-importar-planilha.js
// Tela: pms-importar-planilha.html
// Função: ler planilha (aba Geral), atualizar coleção "pms" usando RE como docId,
// e resolver unidade por OPM consultando coleção "unidades" no campo "nome".
// Se OPM não existir: pergunta se deseja cadastrar (abre cadastro-unidade.html em nova aba e pausa),
// ou ignora aquela OPM e continua.
// Lista embaixo no formato: "2º SGT PM 125010 VALDEMIR SANTOS" (uppercase).
import { db } from "/js/firebase.js";

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";


// ========================
// 2) Referências de tela
// ========================
const inputArquivo = document.getElementById("arquivoExcel");
const btnIniciar = document.getElementById("btnIniciarImportacao");
const btnParar = document.getElementById("btnPararImportacao");
const listaAtualizacoes = document.getElementById("listaAtualizacoes");
const resumoImportacao = document.getElementById("resumoImportacao");

let pararProcesso = false;

// Cache para não consultar a mesma OPM várias vezes
const cacheUnidades = new Map(); // chave: OPM (UPPERCASE) -> { unidadeNome, unidadeId }
const opmsIgnoradas = new Set(); // OPMs que o usuário optou por ignorar

// ========================
// 3) Utilitários
// ========================
function limparListaAtualizacoes() {
    listaAtualizacoes.innerHTML = "";
    resumoImportacao.textContent = "";
}

function adicionarAtualizacao({ re, nomeCompleto, postoGrad }) {
    const item = document.createElement("div");
    item.className = "list-group-item";

    // Formato solicitado:
    // 2º SGT PM 125010 VALDEMIR SANTOS
    item.textContent = `${postoGrad} ${re} ${nomeCompleto}`.trim();

    // mais recente em cima
    listaAtualizacoes.prepend(item);
}

function atualizarResumo({ total, puladosSemRe, opmsIgnoradasQtd, interrompido }) {
    const textoBase =
        `Total importado/atualizado: ${total} • ` +
        `Linhas sem RE: ${puladosSemRe} • ` +
        `OPMs ignoradas: ${opmsIgnoradasQtd}`;

    resumoImportacao.textContent = interrompido ? `${textoBase} • Processo pausado/parado.` : textoBase;
}

function limparRe(valor) {
    if (valor === null || valor === undefined || valor === "") return "";
    let texto = String(valor).trim();
    if (texto.includes(".")) {
        texto = texto.split(".")[0]; // ex.: "125010.0" -> "125010"
    }
    return texto;
}

function toUpper(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor).trim().toUpperCase();
}

function lerArquivoComoArrayBuffer(arquivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(arquivo);
    });
}

/**
 * Busca a unidade na coleção "unidades" pelo campo "nome" == OPM (UPPERCASE).
 * Se encontrar:
 *  - unidadeId = docSnap.id
 *  - unidadeNome = dados.nome (UPPERCASE)
 * Se não encontrar: retorna null
 */
async function buscarUnidadePorOpm(opm) {
    
    if (!opm) return null;

    // se já está no cache
    if (cacheUnidades.has(opm)) {
        return cacheUnidades.get(opm);
    }

    // consulta no Firestore
    const ref = collection(db, "unidades");
    const q = query(ref, where("nome", "==", opm));
    const snap = await getDocs(q);

    if (snap.empty) {
        return null;
    }

    const docSnap = snap.docs[0];
    const dados = docSnap.data();

    const unidade = {
        unidadeId: docSnap.id,
        unidadeNome: toUpper(dados.nome || opm)
    };

    cacheUnidades.set(opm, unidade);
    return unidade;
}

// ========================
// 4) Eventos de tela
// ========================
inputArquivo.addEventListener("change", () => {
    btnIniciar.disabled = !inputArquivo.files.length;
    limparListaAtualizacoes();
});

btnParar.addEventListener("click", () => {
    pararProcesso = true;
    btnParar.disabled = true;
    atualizarResumo({
        total: 0,
        puladosSemRe: 0,
        opmsIgnoradasQtd: opmsIgnoradas.size,
        interrompido: true
    });
});

// ========================
// 5) Fluxo principal
// ========================
btnIniciar.addEventListener("click", async () => {
    const arquivo = inputArquivo.files[0];
    if (!arquivo) {
        alert("Selecione um arquivo Excel primeiro.");
        return;
    }

    // Estado inicial
    pararProcesso = false;
    btnIniciar.disabled = true;
    btnParar.disabled = false;
    inputArquivo.disabled = true;

    limparListaAtualizacoes();

    let totalImportados = 0;
    let puladosSemRe = 0;
    let interrompido = false;

    try {
        const arrayBuffer = await lerArquivoComoArrayBuffer(arquivo);

        // Lê o workbook pelo SheetJS (xlsx)
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        // Preferência: aba "Geral"; se não existir, pega a primeira
        const nomeAba = workbook.SheetNames.includes("Geral")
            ? "Geral"
            : workbook.SheetNames[0];

        const sheet = workbook.Sheets[nomeAba];

        // range: 3 => cabeçalho está na linha 4 (0-based)
        const linhas = XLSX.utils.sheet_to_json(sheet, { range: 3 });

        if (!linhas.length) {
            alert("Nenhuma linha encontrada na planilha (verifique a aba e o cabeçalho).");
            return;
        }

        // Varre linhas
        for (const linha of linhas) {
            if (pararProcesso) {
                interrompido = true;
                break;
            }

            // Colunas esperadas: "POSTO GRAD", "RE", "NOME", "OPM", "SUBUNIDADE"
            const re = limparRe(linha["RE"]);
            if (!re) {
                puladosSemRe++;
                continue;
            }

            const opmPlanilha = toUpper(linha["OPM"]);
            if (!opmPlanilha) {
                // sem OPM -> não conseguimos resolver unidade
                // você pediu ignorar campos não informados; aqui vamos pular a linha
                continue;
            }

            // Se já ignorou esta OPM, pula direto
            if (opmsIgnoradas.has(opmPlanilha)) {
                continue;
            }

            // Buscar unidade pelo nome
            const unidade = await buscarUnidadePorOpm(opmPlanilha);

            // Unidade não existe -> decisão do usuário
            if (!unidade) {
                const mensagem =
                    `OPM não cadastrada encontrada na planilha:\n\n` +
                    `${opmPlanilha}\n\n` +
                    `Deseja cadastrar agora?\n` +
                    `(Se SIM: abriremos o cadastro de unidade e vamos PAUSAR a importação.)\n` +
                    `(Se NÃO: vamos IGNORAR os PMs desta OPM e continuar.)`;

                const desejaCadastrar = window.confirm(mensagem);

                if (desejaCadastrar) {
                    // abre cadastro e pausa o processo
                    const urlCadastro = `cadastro-unidade.html?opm=${encodeURIComponent(opmPlanilha)}`;
                    window.open(urlCadastro, "_blank");

                    alert(
                        "Cadastre a unidade na nova aba.\n" +
                        "Após salvar, volte aqui e clique em 'Iniciar cadastros' novamente para continuar."
                    );

                    interrompido = true;
                    break;
                } else {
                    // ignora esta OPM e segue
                    opmsIgnoradas.add(opmPlanilha);
                    atualizarResumo({
                        total: totalImportados,
                        puladosSemRe,
                        opmsIgnoradasQtd: opmsIgnoradas.size,
                        interrompido: false
                    });
                    continue;
                }
            }

            // Campos do PM (uppercase)
            const postoGrad = linha["POSTO GRAD"];
            const nomeCompleto = toUpper(linha["NOME"]);
            const subunidade = toUpper(linha["SUBUNIDADE"]);

            // Documento final no Firestore
            const dadosPm = {
                companhia: subunidade,
                criadoEm: serverTimestamp(),
                nomeCompleto: nomeCompleto,
                nomeGuerra: "",
                postoGraduacao: postoGrad,
                re: re,
                unidadeNome: unidade.unidadeNome, // do campo "nome" em unidades
                unidadeId: unidade.unidadeId      // ID do doc de unidades
            };

            // Atualiza/cria (merge) pelo docId = RE
            await setDoc(doc(db, "pms", re), dadosPm, { merge: true });
            totalImportados++;

            // Mostra na lista no formato pedido
            adicionarAtualizacao({ re, nomeCompleto, postoGrad });

            // Atualiza resumo
            atualizarResumo({
                total: totalImportados,
                puladosSemRe,
                opmsIgnoradasQtd: opmsIgnoradas.size,
                interrompido: false
            });
        }
    } catch (erro) {
        console.error(erro);
        alert("Ocorreu um erro durante a importação. Verifique o console do navegador.");
    } finally {
        // Reabilita controles
        inputArquivo.disabled = false;
        btnIniciar.disabled = !inputArquivo.files.length;
        btnParar.disabled = true;

        atualizarResumo({
            total: totalImportados,
            puladosSemRe,
            opmsIgnoradasQtd: opmsIgnoradas.size,
            interrompido
        });
    }
});
