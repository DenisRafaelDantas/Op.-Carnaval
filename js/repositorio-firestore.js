// js/repositorio-firestore.js
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =========================
   LEITURA (operação e admin)
   ========================= */

// ✅ Cache simples em memória para evitar leituras repetidas (mesma aba)
// - Não persiste entre refresh
// - TTL curto para não “prender” dados antigos no admin
// ⚠️ Importante: cache só é atualizado se a leitura der certo
const _cache = {
  pms: { ts: 0, data: null },
  patrulhas: { ts: 0, data: null }
};

function _agoraMs() {
  return Date.now();
}

const _TTL_MS = 30 * 1000; // 30s

function _cacheValido(entry) {
  return entry && entry.data && (_agoraMs() - entry.ts) < _TTL_MS;
}

function _cacheSet(chave, dados) {
  _cache[chave] = { ts: _agoraMs(), data: dados };
}

export function limparCacheFS() {
  _cache.pms = { ts: 0, data: null };
  _cache.patrulhas = { ts: 0, data: null };
}

export async function lerPmsFS() {
  if (_cacheValido(_cache.pms)) return _cache.pms.data;

  try {
    const snap = await getDocs(collection(db, "pms"));
    const dados = snap.docs.map((d) => d.data());
    _cacheSet("pms", dados);
    return dados;
  } catch (e) {
    console.error("[Firestore] Falha em lerPmsFS()", e);
    throw e; // ✅ não mascara erro
  }
}

export async function lerPatrulhasFS() {
  if (_cacheValido(_cache.patrulhas)) return _cache.patrulhas.data;

  try {
    const snap = await getDocs(collection(db, "patrulhas"));
    const dados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    _cacheSet("patrulhas", dados);
    return dados;
  } catch (e) {
    console.error("[Firestore] Falha em lerPatrulhasFS()", e);
    throw e;
  }
}

/* =========================
   LEITURA OTIMIZADA (reduz custo)
   ========================= */

/** Lê apenas patrulhas de uma data específica (dataEscala == YYYY-MM-DD). */
export async function lerPatrulhasPorDataFS(dataISO) {
  const data = String(dataISO || "").trim();
  if (!data) return [];

  try {
    const q = query(collection(db, "patrulhas"), where("dataEscala", "==", data));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[Firestore] Falha em lerPatrulhasPorDataFS()", e);
    throw e;
  }
}

/** Lê apenas patrulhas onde o RE aparece na composição (array-contains). */
export async function lerPatrulhasDoReFS(re) {
  const reNorm = String(re || "").replace(/\D/g, "").slice(0, 10);
  if (!reNorm) return [];

  try {
    const q = query(collection(db, "patrulhas"), where("composicaoRe", "array-contains", reNorm));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[Firestore] Falha em lerPatrulhasDoReFS()", e);
    throw e;
  }
}

/** Busca a patrulha do RE em uma data, evitando ler todas as patrulhas do banco. */
export async function lerPatrulhaDoReNaDataFS(re, dataISO) {
  const data = String(dataISO || "").trim();
  const reNorm = String(re || "").replace(/\D/g, "").slice(0, 10);
  if (!data || !reNorm) return null;

  try {
    // Estratégia barata e sem índice composto:
    // filtra por data no servidor e faz o "contains" no cliente.
    const patrulhasDaData = await lerPatrulhasPorDataFS(data);
    const achou = (patrulhasDaData || []).find((p) => {
      const comp = Array.isArray(p?.composicaoRe) ? p.composicaoRe.map(String) : [];
      return comp.includes(reNorm);
    });
    return achou || null;
  } catch (e) {
    console.error("[Firestore] Falha em lerPatrulhaDoReNaDataFS()", e);
    throw e;
  }
}

/* =========================
   ESCRITA (admin)
   =========================
   - PM: usa RE como ID do documento
 */

export async function salvarPmFS(pm) {
  const re = String(pm.re || "").trim();
  if (!re) throw new Error("RE inválido para salvar PM.");

  try {
    await setDoc(doc(db, "pms", re), pm, { merge: true });
    // opcional: invalida cache pra refletir no admin
    _cache.pms = { ts: 0, data: null };
  } catch (e) {
    console.error("[Firestore] Falha em salvarPmFS()", e);
    throw e;
  }
}

export async function lerPmPorReFS(re) {
  try {
    const ref = doc(db, "pms", String(re));
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("[Firestore] Falha em lerPmPorReFS()", e);
    throw e;
  }
}

/* =========================
   PATRULHAS (completo)
   ========================= */

export async function criarPatrulhaFS(patrulha) {
  try {
    const ref = await addDoc(collection(db, "patrulhas"), patrulha);
    // invalida cache
    _cache.patrulhas = { ts: 0, data: null };
    return ref.id;
  } catch (e) {
    console.error("[Firestore] Falha em criarPatrulhaFS()", e);
    throw e;
  }
}

export async function salvarPatrulhaFS(id, patrulha) {
  if (!id) throw new Error("Informe o ID da patrulha.");

  try {
    await setDoc(doc(db, "patrulhas", String(id)), patrulha, { merge: true });
    _cache.patrulhas = { ts: 0, data: null };
  } catch (e) {
    console.error("[Firestore] Falha em salvarPatrulhaFS()", e);
    throw e;
  }
}

export async function atualizarPatrulhaFS(id, patch) {
  try {
    await updateDoc(doc(db, "patrulhas", String(id)), patch);
    _cache.patrulhas = { ts: 0, data: null };
  } catch (e) {
    console.error("[Firestore] Falha em atualizarPatrulhaFS()", e);
    throw e;
  }
}

export async function lerPatrulhaPorIdFS(id) {
  try {
    const ref = doc(db, "patrulhas", String(id));
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
  } catch (e) {
    console.error("[Firestore] Falha em lerPatrulhaPorIdFS()", e);
    throw e;
  }
}

export async function excluirPatrulhaFS(id) {
  if (!id) throw new Error("Informe o id da patrulha para excluir.");

  try {
    await deleteDoc(doc(db, "patrulhas", String(id)));
    _cache.patrulhas = { ts: 0, data: null };
  } catch (e) {
    console.error("[Firestore] Falha em excluirPatrulhaFS()", e);
    throw e;
  }
}

/* =========================
   UNIDADES
   ========================= */

function normalizarIdUnidade(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function gerarIdUnidade(unidade) {
  const bpm = normalizarIdUnidade(unidade?.bpm);
  const cia = normalizarIdUnidade(unidade?.cia);
  const nome = normalizarIdUnidade(unidade?.nome);

  const base = (bpm && cia) ? `${bpm}-${cia}` : (nome || "unidade");
  return base;
}

export async function lerUnidadesFS() {
  try {
    const snap = await getDocs(collection(db, "unidades"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[Firestore] Falha em lerUnidadesFS()", e);
    throw e;
  }
}

export async function salvarUnidadeFS(unidade) {
  const id = unidade?.id ? String(unidade.id) : gerarIdUnidade(unidade);
  if (!id) throw new Error("ID inválido para unidade.");

  const payload = { ...unidade };
  delete payload.id;

  try {
    await setDoc(doc(db, "unidades", id), payload, { merge: true });
    return id;
  } catch (e) {
    console.error("[Firestore] Falha em salvarUnidadeFS()", e);
    throw e;
  }
}

export async function excluirUnidadeFS(id) {
  if (!id) throw new Error("Informe o id da unidade para excluir.");

  try {
    await deleteDoc(doc(db, "unidades", String(id)));
  } catch (e) {
    console.error("[Firestore] Falha em excluirUnidadeFS()", e);
    throw e;
  }
}

export async function lerUnidadePorIdFS(id) {
  try {
    const ref = doc(db, "unidades", String(id));
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
  } catch (e) {
    console.error("[Firestore] Falha em lerUnidadePorIdFS()", e);
    throw e;
  }
}

/* =========================
   PMs (extras)
   ========================= */

export async function excluirPmPorReFS(re) {
  const chave = String(re || "").trim();
  if (!chave) throw new Error("Informe o RE para excluir.");

  try {
    await deleteDoc(doc(db, "pms", chave));
    _cache.pms = { ts: 0, data: null };
  } catch (e) {
    console.error("[Firestore] Falha em excluirPmPorReFS()", e);
    throw e;
  }
}

/* =========================
   PRESENÇA (operação)
   - Cria presença por (dataISO + RE)
   - Se já existir, não altera
   ========================= */

export async function registrarPresencaFS({ re, dataISO, codigoDispositivo,  }) {
  const reLimpo = String(re || "").replace(/\D/g, "").slice(0, 6);
  const data = String(dataISO || "").trim();

  if (!reLimpo) throw new Error("RE inválido para registrar presença.");
  if (!data) throw new Error("dataISO inválida para registrar presença.");

  const id = `${data}_${reLimpo}`;
  const ref = doc(db, "presencas", id);

  // Regra: NÃO ALTERAR se já existe
  const snap = await getDoc(ref);
  if (snap.exists()) return { ok: true, jaExistia: true, id };

  // Cria (primeiro acesso do dia)
  await setDoc(ref, {
    re: reLimpo,
    dataISO: data,
    criadoEm: serverTimestamp(),
    criadoEmLocal: Date.now(),
    codigoDispositivo: String(codigoDispositivo || "")
  });

  return { ok: true, jaExistia: false, id };
}

