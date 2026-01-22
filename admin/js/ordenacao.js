/* =========================
   Ordenação por antiguidade (PMESP)
   - Do mais antigo (Cel PM) ao mais moderno (Sd PM 2ª Cl)
   ========================= */

/* Lista em ordem de antiguidade */
const ORDEM_POSTO_ANTIGUIDADE = [
  "CEL PM",
  "TEN CEL PM",
  "MAJ PM",
  "CAP PM",
  "1º TEN PM",
  "2º TEN PM",
  "ASP OF PM",
  "SUBTEN PM",
  "1º SGT PM",
  "2º SGT PM",
  "3º SGT PM",
  "CB PM",
  "SD PM",
  "SD PM 2ª CL"
];

/* Mapa: posto -> prioridade (0 = mais antigo) */
const MAPA_PRIORIDADE_POSTO = new Map(
  ORDEM_POSTO_ANTIGUIDADE.map((posto, idx) => [posto, idx])
);

/* Normaliza o texto do posto (garante comparação consistente) */
function normalizarPosto(posto) {
  return String(posto || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " "); // remove espaços duplicados
}

/* Retorna prioridade numérica do posto; se não reconhecer, joga pro fim */
function prioridadePosto(posto) {
  const p = normalizarPosto(posto);
  return MAPA_PRIORIDADE_POSTO.has(p) ? MAPA_PRIORIDADE_POSTO.get(p) : 999;
}

/* Ordena lista de PMs por:
   1) posto (antiguidade)
   2) RE (como desempate)
*/
function ordenarPmsPorAntiguidade(lista) {
  return [...lista].sort((a, b) => {
    const pa = prioridadePosto(a.postoGraduacao);
    const pb = prioridadePosto(b.postoGraduacao);

    if (pa !== pb) return pa - pb;

    /* Desempate por RE (crescente) */
    return String(a.re || "").localeCompare(String(b.re || ""), "pt-BR");
  });
}
// Commit de verificação geral
