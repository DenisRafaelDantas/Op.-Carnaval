/* =========================
   Admin • Cadastro de Patrulha (Criar/Editar) • Firestore
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
   Referências (tentei cobrir nomes comuns)
   ========================= */

/* Form */
const formPatrulha = porIdPossiveis([
  "form-patrulha",
  "formPatrulha",
  "form-cadastro-patrulha",
  "formCadastroPatrulha"
]);

/* Campos */
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

/* =========================
   Segurança: valida se elementos essenciais existem
   ========================= */
if (!formPatrulha || !inputNumero || !inputCpp || !inputMapa || !inputMissao || !btnCancelar) {
  console.error("IDs esperados não encontrados no patrulha.html.");
  alert("Erro: não encontrei alguns campos do formulário. Verifique os IDs no patrulha.html.");
}

/* =========================
   Estado (modo)
   ========================= */
const params = new URLSearchParams(window.location.search);
const idEdicao = params.get("id");      // string docId do Firestore
const MODO_EDICAO = Boolean(idEdicao);

/* =========================
   Validação simples
   ========================= */
function campoVazio(el) {
  return !String(el.value || "").trim();
}

function marcarInvalido(el, invalido) {
  if (invalido) el.classList.add("is-invalid");
  else el.classList.remove("is-invalid");
}

/* Número automático: pega o maior número e soma 1 (01, 02...) */
async function proximoNumeroPatrulhaFS() {
  const lista = await lerPatrulhasFS();

  const nums = lista
    .map((p) => String(p.numero || "").replace(/\D/g, ""))
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  const max = nums.length ? Math.max(...nums) : 0;
  const prox = max + 1;

  return prox < 100 ? String(prox).padStart(2, "0") : String(prox);
}

/* =========================
   Modo editar: carregar dados
   ========================= */
async function aplicarModoEdicaoSeNecessario() {
  if (!MODO_EDICAO) {
    /* Cadastro: número automático e travado */
    inputNumero.value = await proximoNumeroPatrulhaFS();
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
  inputNumero.value = String(patrulha.numero || "");
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
[inputCpp, inputMapa, inputMissao].forEach((campo) => {
  if (!campo) return;
  campo.addEventListener("input", () => marcarInvalido(campo, false));
});

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

    if (campoVazio(inputCpp)) { marcarInvalido(inputCpp, true); ok = false; }
    if (campoVazio(inputMapa)) { marcarInvalido(inputMapa, true); ok = false; }
    if (campoVazio(inputMissao)) { marcarInvalido(inputMissao, true); ok = false; }

    if (!ok) return;

    const dados = {
      numero: String(inputNumero.value || "").trim(),
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

        alert(`PATRULHA ${dados.numero} ATUALIZADA.`);
        window.location.href = "patrulhas.html";
        return;
      }

      /* CADASTRAR */
      const nova = {
        ...dados,
        // deixa composição pronta para o vínculo
        composicaoRe: [],
        criadoEm: new Date().toISOString()
      };

      await criarPatrulhaFS(nova);

      alert(`PATRULHA ${dados.numero} CADASTRADA.`);

      /* Prepara próxima */
      inputNumero.value = await proximoNumeroPatrulhaFS();
      inputCpp.value = "";
      inputMapa.value = "";
      inputMissao.value = "";

      marcarInvalido(inputCpp, false);
      marcarInvalido(inputMapa, false);
      marcarInvalido(inputMissao, false);

      atualizarPreviaMapa();
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

// primeira chamada (em cadastro)
atualizarPreviaMapa();
