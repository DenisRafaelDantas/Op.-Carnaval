/* =========================
   Regras do campo RE
   ========================= */

/* Obtém referências aos elementos da tela */
const formRe = document.getElementById("form-re");     // formulário principal
const inputRe = document.getElementById("re");         // campo de RE
const btnEntrar = document.getElementById("btn-entrar"); // botão Entrar

/* Função: mantém apenas números no campo e limita a 6 dígitos */
function normalizarRe(valor) {
    /* Remove tudo que não for dígito */
    const somenteNumeros = valor.replace(/\D/g, "");

    /* Garante no máximo 6 caracteres */
    return somenteNumeros.slice(0, 6);
}

/* Função: valida se o RE tem exatamente 6 dígitos */
function reValido(valor) {
    /* Regex: exatamente 6 números */
    return /^\d{6}$/.test(valor);
}

/* Evento: ao digitar, filtramos caracteres e atualizamos estado do botão */
inputRe.addEventListener("input", () => {
    /* Normaliza o que foi digitado (só números e até 6) */
    inputRe.value = normalizarRe(inputRe.value);

    /* Habilita/desabilita botão conforme validade */
    btnEntrar.disabled = !reValido(inputRe.value);

    /* Remove visual de erro enquanto o usuário está corrigindo */
    if (inputRe.classList.contains("is-invalid")) {
        inputRe.classList.remove("is-invalid");
    }
});

/* Evento: colagem (Ctrl+V) também deve respeitar as regras */
inputRe.addEventListener("paste", (event) => {
    /* Impede colagem “bruta” */
    event.preventDefault();

    /* Pega texto colado */
    const textoColado = (event.clipboardData || window.clipboardData).getData("text");

    /* Normaliza e aplica no input */
    inputRe.value = normalizarRe(textoColado);

    /* Atualiza botão */
    btnEntrar.disabled = !reValido(inputRe.value);
});

/* Evento: submit do formulário */
formRe.addEventListener("submit", (event) => {
    /* Impede envio real (sem backend por enquanto) */
    event.preventDefault();

    /* Se inválido, mostra feedback do Bootstrap */
    if (!reValido(inputRe.value)) {
        inputRe.classList.add("is-invalid"); // marca campo como inválido
        btnEntrar.disabled = true;           // reforça desabilitado
        return;
    }

    /* RE válido (normaliza para garantir somente números) */
    const re = String(inputRe.value).replace(/\D/g, "").slice(0, 6);

    /* Salva o RE na sessão (ajuda caso o PM dê refresh na página) */
    sessionStorage.setItem("opCarnaval_reAtual", re);

    /* Redireciona para a tela final do operacional */
    window.location.href = `escala.html?re=${encodeURIComponent(re)}`;
});
// Commit de verificação geral

