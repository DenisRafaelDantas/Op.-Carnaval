/* =========================
   Admin • Cadastro de Patrulha (Criar/Editar)
   =========================
   Armazena:
   - numero (automático: 01, 02, 03...)
   - CPP (texto/endereço)
   - mapa (texto: pode ser link ou iframe)
   - missão (texto)

   Modo:
   - CADASTRAR: abre sem ?id
   - EDITAR: abre com ?id=xxxx

   Storage:
   - opCarnaval_patrulhas
   ========================= */

/* Chave do "banco" (mock) */
const CHAVE_PATRULHAS = "opCarnaval_patrulhas";

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

/* “Mapa” pode ser input ou textarea */
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
const idEdicao = params.get("id");      // string
const MODO_EDICAO = Boolean(idEdicao);  // true/false

/* =========================
   Storage helpers
   ========================= */
function lerPatrulhas() {
  const dados = JSON.parse(localStorage.getItem(CHAVE_PATRULHAS) || "[]");
  return Array.isArray(dados) ? dados : [];
}

function salvarPatrulhas(lista) {
  localStorage.setItem(CHAVE_PATRULHAS, JSON.stringify(lista));
}

function buscarPatrulhaPorId(id) {
  return lerPatrulhas().find((p) => String(p.id) === String(id));
}

/* Gera ID fixo para patrulha */
function gerarIdPatrulha() {
  /* Se o navegador suportar UUID, usa */
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();

  /* Fallback */
  return `pat_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

/* Número automático: pega o maior número e soma 1 (01, 02...) */
function proximoNumeroPatrulha() {
  const lista = lerPatrulhas();

  /* Extrai números válidos */
  const nums = lista
    .map((p) => String(p.numero || "").replace(/\D/g, ""))
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  const max = nums.length ? Math.max(...nums) : 0;
  const prox = max + 1;

  /* Formata com 2 dígitos (01,02... até 99). Se passar de 99, fica 100 etc. */
  return prox < 100 ? String(prox).padStart(2, "0") : String(prox);
}

/* Atualiza patrulha por ID (retorna true se atualizou) */
function atualizarPatrulhaPorId(id, novosDados) {
  const lista = lerPatrulhas();
  const idx = lista.findIndex((p) => String(p.id) === String(id));
  if (idx === -1) return false;

  lista[idx] = { ...lista[idx], ...novosDados, id: String(id) };
  salvarPatrulhas(lista);
  return true;
}

/* Cria patrulha nova */
function criarPatrulha(p) {
  const lista = lerPatrulhas();
  lista.push(p);
  salvarPatrulhas(lista);
}

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

/* =========================
   Modo editar: carregar dados
   ========================= */
function aplicarModoEdicaoSeNecessario() {
  if (!MODO_EDICAO) {
    /* Cadastro: número automático e travado */
    inputNumero.value = proximoNumeroPatrulha();
    inputNumero.disabled = true;
    return;
  }

  const patrulha = buscarPatrulhaPorId(idEdicao);

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
(function init() {
  if (!formPatrulha) return;
  aplicarModoEdicaoSeNecessario();
})();

/* =========================
   Eventos
   ========================= */

/* Remove erro ao digitar */
[inputCpp, inputMapa, inputMissao].forEach((campo) => {
  if (!campo) return;
  campo.addEventListener("input", () => marcarInvalido(campo, false));
});

/* Cancelar: volta para listagem de patrulhas */
if (btnCancelar) {
  btnCancelar.addEventListener("click", () => {
    window.location.href = "patrulhas.html";
  });
}

/* Submit: cria ou edita */
if (formPatrulha) {
  formPatrulha.addEventListener("submit", (event) => {
    event.preventDefault();

    let ok = true;

    /* Validações mínimas (obrigatórios) */
    if (campoVazio(inputCpp)) { marcarInvalido(inputCpp, true); ok = false; }
    if (campoVazio(inputMapa)) { marcarInvalido(inputMapa, true); ok = false; }
    if (campoVazio(inputMissao)) { marcarInvalido(inputMissao, true); ok = false; }

    if (!ok) return;

    /* Dados */
    const dados = {
      numero: String(inputNumero.value || "").trim(), // 01,02...
      cpp: String(inputCpp.value || "").trim(),
      mapa: String(inputMapa.value || "").trim(),
      missao: String(inputMissao.value || "").trim()
    };

    /* Editar */
    if (MODO_EDICAO) {
      const atualizou = atualizarPatrulhaPorId(idEdicao, {
        ...dados,
        atualizadoEm: new Date().toISOString()
      });

      if (!atualizou) {
        alert("Falha ao atualizar: patrulha não encontrada.");
        return;
      }

      alert(`PATRULHA ${dados.numero} ATUALIZADA.`);
      window.location.href = "patrulhas.html";
      return;
    }

    /* Cadastrar */
    const nova = {
      id: gerarIdPatrulha(),
      ...dados,
      criadoEm: new Date().toISOString()
    };

    criarPatrulha(nova);

    alert(`PATRULHA ${dados.numero} CADASTRADA.`);

    /* Prepara para cadastrar próxima: incrementa número e limpa campos */
    inputNumero.value = proximoNumeroPatrulha();
    inputCpp.value = "";
    inputMapa.value = "";
    inputMissao.value = "";

    marcarInvalido(inputCpp, false);
    marcarInvalido(inputMapa, false);
    marcarInvalido(inputMissao, false);
  });
}

/* =========================
   Prévia do mapa (Google Maps)
   =========================
   HTML:
   - Campo:      #mapa
   - Iframe:     #mapaPreview
   - Mensagem:   #mapaVazio
   - Botão:      #btnLimparMapa
   ========================= */

/* Elementos da prévia */
const iframePreview = document.getElementById("mapaPreview");  // iframe da prévia
const avisoMapaVazio = document.getElementById("mapaVazio");   // texto "Cole um link..."
const btnLimparMapa = document.getElementById("btnLimparMapa"); // botão limpar

/* Remove aspas se o usuário colar "https://..." */
function removerAspasExternas(texto) {
  return String(texto || "").trim().replace(/^["']|["']$/g, "").trim();
}

/* Extrai src de um iframe colado */
function extrairSrcIframe(texto) {
  const match = String(texto || "").match(/src\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

/* Verifica se é um link embed válido (inclui My Maps) */
function ehLinkEmbedValido(url) {
  const u = String(url || "");
  return (
    u.includes("google.com/maps/embed") ||
    u.includes("google.com/maps/d/embed")
  );
}

/* Atualiza a prévia do mapa */
function atualizarPreviaMapa() {
  /* Se a página não tiver os elementos, não faz nada */
  if (!inputMapa || !iframePreview || !avisoMapaVazio) return;

  /* Pega o conteúdo do campo */
  const bruto = String(inputMapa.value || "");
  const texto = removerAspasExternas(bruto);

  /* Se vazio: limpa preview e mostra aviso */
  if (!texto.trim()) {
    iframePreview.src = "";
    avisoMapaVazio.classList.remove("d-none");
    return;
  }

  let srcFinal = "";

  /* Se colou um iframe: extrai o src */
  if (texto.toLowerCase().includes("<iframe")) {
    srcFinal = extrairSrcIframe(texto);
  } else {
    /* Se colou um link embed direto */
    if (ehLinkEmbedValido(texto)) {
      srcFinal = texto;
    }
  }

  /* Se não conseguiu obter src: limpa e mostra aviso */
  if (!srcFinal) {
    iframePreview.src = "";
    avisoMapaVazio.classList.remove("d-none");
    return;
  }

  /* Atualiza o iframe */
  iframePreview.src = srcFinal;

  /* Esconde o aviso */
  avisoMapaVazio.classList.add("d-none");
}

/* Eventos para atualizar a prévia ao digitar/colar */
if (inputMapa) {
  inputMapa.addEventListener("input", atualizarPreviaMapa);
  inputMapa.addEventListener("change", atualizarPreviaMapa);
}

/* Botão "Limpar mapa" */
if (btnLimparMapa) {
  btnLimparMapa.addEventListener("click", () => {
    if (!inputMapa || !iframePreview || !avisoMapaVazio) return;

    inputMapa.value = "";
    iframePreview.src = "";
    avisoMapaVazio.classList.remove("d-none");
    inputMapa.classList.remove("is-invalid");
  });
}

/* Atualiza prévia ao abrir a tela (importante no modo EDITAR) */
atualizarPreviaMapa();
