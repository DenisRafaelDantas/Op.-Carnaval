/* =========================
   Força UPPERCASE global
   - EXCETO campos marcados com data-no-uppercase
   - NÃO interfere em SELECT
   ========================= */

document.addEventListener("input", (event) => {
  const el = event.target;

  /* Ignora se não for input ou textarea */
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    return;
  }

  /* Ignora campos marcados explicitamente */
  if (el.hasAttribute("data-no-uppercase")) {
    return;
  }

  /* Ignora inputs que não devem ser alterados */
  const tipo = (el.type || "").toLowerCase();
  if (tipo === "number" || tipo === "tel" || tipo === "url") {
    return;
  }

  /* Mantém cursor */
  const pos = el.selectionStart;

  /* Aplica uppercase */
  el.value = el.value.toUpperCase();

  /* Restaura cursor */
  if (typeof pos === "number") {
    el.setSelectionRange(pos, pos);
  }
});
