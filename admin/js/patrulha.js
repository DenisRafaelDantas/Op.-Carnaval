/* =========================
   Admin • Cadastro de Patrulha (Criar/Editar) • Firestore
   - Patrulha possui: dataEscala, horarioInicio, horarioFim, local, revista
   - Número é gerado AUTOMATICAMENTE POR DIA (reinicia a cada data)
   ========================= */

import {
  lerPatrulhasFS,
  criarPatrulhaFS,
  salvarPatrulhaFS,
  lerPatrulhaPorIdFS
} from "../../js/repositorio-firestore.js";

/* =========================
   Helper: buscar elemento por vários IDs possíveis
   ========================= */
function porIdPossiveis(listaIds) {
  for (const id of listaIds) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

/* =========================
   Referências
   ========================= */

/* Form */
const formPatrulha = porIdPossiveis([
  "form-patrulha",
  "formPatrulha",
  "form-cadastro-patrulha",
  "formCadastroPatrulha"
]);

/* Campos NOVOS */
const inputDataEscala = porIdPossiveis([
  "dataEscala",
  "data",
  "dataPatrulha"
]);

const inputHoraInicio = porIdPossiveis([
  "horaInicio",
  "inicio",
  "horarioInicio"
]);

const inputHoraFim = porIdPossiveis([
  "horaFim",
  "fim",
  "horarioFim"
]);

/* ✅ NOVOS: Local e Revista */
const inputLocal = porIdPossiveis([
  "local",
  "localOperacao",
  "localDaOperacao"
]);

const inputRevista = porIdPossiveis([
  "revista",
  "localRevista",
  "revistaLocal"
]);

/* Campos antigos */
const inputNumero = porIdPossiveis([
  "numeroPatrulha",
  "numero",
  "patrulhaNumero",
  "numPatrulha"
]);

const inputCpp = porIdPossiveis([
  "cpp",
  "CPP",
  "enderecoCpp",
  "endereco",
  "enderecoPatrulha"
]);

const inputMapa = porIdPossiveis([
  "mapa",
  "mapaGoogle",
  "googleMaps",
  "linkMapa",
  "iframeMapa"
]);

const inputMissao = porIdPossiveis([
  "missao",
  "missaoPatrulha",
  "missaoTexto"
]);

/* Botão cancelar */
const btnCancelar = porIdPossiveis([
  "btnCancelar",
  "btnCancelarPatrulha",
  "cancelar"
]);

/* Segurança */
if (
  !formPatrulha ||
  !inputNumero || !inputCpp || !inputMapa || !inputMissao || !btnCancelar ||
  !inputDataEscala || !inputHoraInicio || !inputHoraFim ||
  !inputLocal || !inputRevista
) {
  console.error("IDs esperados não encontrados no patrulha.html.");
  alert("Erro: não encontrei alguns campos do formulário. Verifique os IDs no patrulha.html.");
}

/* Estado (modo) */
const params = new URLSearchParams(window.location.search);
const idEdicao = params.get("id");      // docId do Firestore
const MODO_EDICAO = Boolean(idEdicao);

/* =========================
   Validação simples
   ========================= */
function campoVazio(el) {
  return !String(el?.value || "").trim();
}

function marcarInvalido(el, invalido) {
  if (!el) return;
  if (invalido) el.classList.add("is-invalid");
  else el.classList.remove("is-invalid");
}

function hojeISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* =========================
   Número automático POR DIA:
   - pega o maior número dentro da MESMA DATA e soma 1 (01, 02...)
   ========================= */
async function proximoNumeroPatrulhaPorDataFS(dataISO) {
  const lista = await lerPatrulhasFS();

  const filtradas = lista.filter((p) =>
    String(p?.dataEscala || "").trim() === String(dataISO || "").trim()
  );

  const nums = filtradas
    .map((p) => String(p.numero || "").replace(/\D/g, ""))
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  const max = nums.length ? Math.max(...nums) : 0;
  const prox = max + 1;

  return prox < 100 ? String(prox).padStart(2, "0") : String(prox);
}

async function recalcularNumeroSeCadastro() {
  if (MODO_EDICAO) return;

  const dataISO = String(inputDataEscala.value || "").trim();
  if (!dataISO) {
    inputNumero.value = "";
    return;
  }

  inputNumero.value = await proximoNumeroPatrulhaPorDataFS(dataISO);
  inputNumero.disabled = true;
}

/* =========================
   Modo editar: carregar dados
   ========================= */
async function aplicarModoEdicaoSeNecessario() {
  // define data padrão no cadastro
  if (!MODO_EDICAO) {
    inputDataEscala.value = hojeISO();
    await recalcularNumeroSeCadastro();
    inputNumero.disabled = true;
    return;
  }

  let patrulha = null;
  try {
    patrulha = await lerPatrulhaPorIdFS(idEdicao);
  } catch (err) {
    console.error(err);
  }

  if (!patrulha) {
    alert("Patrulha não encontrada para edição.");
    window.location.href = "patrulhas.html";
    return;
  }

  /* Preenche */
  inputDataEscala.value = String(patrulha.dataEscala || "");
  inputHoraInicio.value = String(patrulha.horarioInicio || "");
  inputHoraFim.value = String(patrulha.horarioFim || "");

  inputNumero.value = String(patrulha.numero || "");

  // ✅ novos campos
  inputLocal.value = String(patrulha.local || "");
  inputRevista.value = String(patrulha.revista || "");

  inputCpp.value = String(patrulha.cpp || "");
  inputMapa.value = String(patrulha.mapa || "");
  inputMissao.value = String(patrulha.missao || "");

  /* Trava número */
  inputNumero.disabled = true;

  /* Ajusta texto do botão submit */
  const btnSalvar = formPatrulha.querySelector('button[type="submit"]');
  if (btnSalvar) btnSalvar.textContent = "Salvar alterações";
}

/* =========================
   Inicialização
   ========================= */
(async function init() {
  if (!formPatrulha) return;
  await aplicarModoEdicaoSeNecessario();
  atualizarPreviaMapa(); // importante no modo EDITAR
})();

/* =========================
   Eventos
   ========================= */

/* Remove erro ao digitar */
[
  inputDataEscala,
  inputHoraInicio,
  inputHoraFim,
  inputLocal,
  inputRevista,
  inputCpp,
  inputMapa,
  inputMissao
].forEach((campo) => {
  if (!campo) return;
  campo.addEventListener("input", () => marcarInvalido(campo, false));
});

/* Se trocar data no CADASTRO, recalcula o número automaticamente */
if (inputDataEscala) {
  inputDataEscala.addEventListener("change", async () => {
    marcarInvalido(inputDataEscala, false);
    try {
      await recalcularNumeroSeCadastro();
    } catch (e) {
      console.warn("Falha ao recalcular número por data:", e);
    }
  });
}

/* Cancelar */
if (btnCancelar) {
  btnCancelar.addEventListener("click", () => {
    window.location.href = "patrulhas.html";
  });
}

/* Submit: cria ou edita */
if (formPatrulha) {
  formPatrulha.addEventListener("submit", async (event) => {
    event.preventDefault();

    let ok = true;

    if (campoVazio(inputDataEscala)) { marcarInvalido(inputDataEscala, true); ok = false; }
    if (campoVazio(inputHoraInicio)) { marcarInvalido(inputHoraInicio, true); ok = false; }
    if (campoVazio(inputHoraFim)) { marcarInvalido(inputHoraFim, true); ok = false; }

    // ✅ novos obrigatórios
    if (campoVazio(inputLocal)) { marcarInvalido(inputLocal, true); ok = false; }
    if (campoVazio(inputRevista)) { marcarInvalido(inputRevista, true); ok = false; }

    if (campoVazio(inputCpp)) { marcarInvalido(inputCpp, true); ok = false; }
    if (campoVazio(inputMapa)) { marcarInvalido(inputMapa, true); ok = false; }
    if (campoVazio(inputMissao)) { marcarInvalido(inputMissao, true); ok = false; }

    if (!ok) return;

    const dados = {
      dataEscala: String(inputDataEscala.value || "").trim(),
      horarioInicio: String(inputHoraInicio.value || "").trim(),
      horarioFim: String(inputHoraFim.value || "").trim(),

      numero: String(inputNumero.value || "").trim(),

      // ✅ novos campos
      local: String(inputLocal.value || "").trim(),
      revista: String(inputRevista.value || "").trim(),

      cpp: String(inputCpp.value || "").trim(),
      mapa: String(inputMapa.value || "").trim(),
      missao: String(inputMissao.value || "").trim()
    };

    try {
      /* EDITAR */
      if (MODO_EDICAO) {
        await salvarPatrulhaFS(idEdicao, {
          ...dados,
          atualizadoEm: new Date().toISOString()
        });

        alert(`PATRULHA ${dados.numero} (${dados.dataEscala}) ATUALIZADA.`);
        window.location.href = "patrulhas.html";
        return;
      }

      /* CADASTRAR */
      const nova = {
        ...dados,
        composicaoRe: [], // pronto para o vínculo
        criadoEm: new Date().toISOString()
      };

      await criarPatrulhaFS(nova);

      alert(`PATRULHA ${dados.numero} (${dados.dataEscala}) CADASTRADA.`);

      /* Prepara próxima (mantém a data e recalcula número) */
      inputLocal.value = "";
      inputRevista.value = "";
      inputCpp.value = "";
      inputMapa.value = "";
      inputMissao.value = "";

      marcarInvalido(inputLocal, false);
      marcarInvalido(inputRevista, false);
      marcarInvalido(inputCpp, false);
      marcarInvalido(inputMapa, false);
      marcarInvalido(inputMissao, false);

      atualizarPreviaMapa();
      await recalcularNumeroSeCadastro();
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar a patrulha. Verifique se você está logado como admin.");
    }
  });
}

/* =========================
   Prévia do mapa (Google Maps) — mantida
   ========================= */

const iframePreview = document.getElementById("mapaPreview");
const avisoMapaVazio = document.getElementById("mapaVazio");
const btnLimparMapa = document.getElementById("btnLimparMapa");

function removerAspasExternas(texto) {
  return String(texto || "").trim().replace(/^["']|["']$/g, "").trim();
}

function extrairSrcIframe(texto) {
  const match = String(texto || "").match(/src\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function ehLinkEmbedValido(url) {
  const u = String(url || "");
  return (
    u.includes("google.com/maps/embed") ||
    u.includes("google.com/maps/d/embed")
  );
}

function atualizarPreviaMapa() {
  if (!inputMapa || !iframePreview || !avisoMapaVazio) return;

  const bruto = String(inputMapa.value || "");
  const texto = removerAspasExternas(bruto);

  if (!texto.trim()) {
    iframePreview.src = "";
    avisoMapaVazio.classList.remove("d-none");
    return;
  }

  let srcFinal = "";

  if (texto.toLowerCase().includes("<iframe")) {
    srcFinal = extrairSrcIframe(texto);
  } else {
    if (ehLinkEmbedValido(texto)) {
      srcFinal = texto;
    }
  }

  if (!srcFinal) {
    iframePreview.src = "";
    avisoMapaVazio.classList.remove("d-none");
    return;
  }

  iframePreview.src = srcFinal;
  avisoMapaVazio.classList.add("d-none");
}

if (inputMapa) {
  inputMapa.addEventListener("input", atualizarPreviaMapa);
  inputMapa.addEventListener("change", atualizarPreviaMapa);
}

if (btnLimparMapa) {
  btnLimparMapa.addEventListener("click", () => {
    if (!inputMapa || !iframePreview || !avisoMapaVazio) return;

    inputMapa.value = "";
    iframePreview.src = "";
    avisoMapaVazio.classList.remove("d-none");
    inputMapa.classList.remove("is-invalid");
  });
}

// primeira chamada (em cadastro/edição)
atualizarPreviaMapa();
