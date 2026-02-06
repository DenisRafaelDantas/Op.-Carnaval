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
  where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =========================
   LEITURA (operação e admin)
   ========================= */

// ✅ Cache simples em memória para evitar leituras repetidas (mesma aba)
// - Não persiste entre refresh
// - TTL curto para não “prender” dados antigos no admin
const _cache = {
  pms: { ts: 0, data: null },
  patrulhas: { ts: 0, data: null }
};

function _agoraMs() {
  return Date.now();
}

const _TTL_MS = 30 * 1000; // 30s (ajuste fácil depois)

function _cacheValido(entry) {
  return entry && entry.data && (_agoraMs() - entry.ts) < _TTL_MS;
}

export async function lerPmsFS() {
  if (_cacheValido(_cache.pms)) return _cache.pms.data;
  const snap = await getDocs(collection(db, "pms"));
  const dados = snap.docs.map((d) => d.data());
  _cache.pms = { ts: _agoraMs(), data: dados };
  return dados;
}

export async function lerPatrulhasFS() {
  if (_cacheValido(_cache.patrulhas)) return _cache.patrulhas.data;
  const snap = await getDocs(collection(db, "patrulhas"));
  const dados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  _cache.patrulhas = { ts: _agoraMs(), data: dados };
  return dados;


/* =========================
   LEITURA OTIMIZADA (reduz custo)
   ========================= */

/** Lê apenas patrulhas de uma data específica (dataEscala == YYYY-MM-DD). */
export async function lerPatrulhasPorDataFS(dataISO) {
  const data = String(dataISO || "").trim();
  if (!data) return [];

  const q = query(collection(db, "patrulhas"), where("dataEscala", "==", data));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Lê apenas patrulhas onde o RE aparece na composição (array-contains). */
export async function lerPatrulhasDoReFS(re) {
  const reNorm = String(re || "").replace(/\D/g, "").slice(0, 10);
  if (!reNorm) return [];

  const q = query(collection(db, "patrulhas"), where("composicaoRe", "array-contains", reNorm));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Busca a patrulha do RE em uma data, evitando ler todas as patrulhas do banco. */
export async function lerPatrulhaDoReNaDataFS(re, dataISO) {
  const data = String(dataISO || "").trim();
  const reNorm = String(re || "").replace(/\D/g, "").slice(0, 10);
  if (!data || !reNorm) return null;

  // Estratégia barata e sem índice composto: filtra por data no servidor e faz o "array-contains" no cliente.
  const patrulhasDaData = await lerPatrulhasPorDataFS(data);
  const achou = (patrulhasDaData || []).find((p) => {
    const comp = Array.isArray(p?.composicaoRe) ? p.composicaoRe.map(String) : [];
    return comp.includes(reNorm);
  });
  return achou || null;
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
  await setDoc(doc(db, "pms", re), pm, { merge: true });
}

export async function lerPmPorReFS(re) {
  const ref = doc(db, "pms", String(re));
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/* =========================
   PATRULHAS (completo)
   ========================= */

export async function criarPatrulhaFS(patrulha) {
  const ref = await addDoc(collection(db, "patrulhas"), patrulha);
  return ref.id;
}

export async function salvarPatrulhaFS(id, patrulha) {
  if (!id) throw new Error("Informe o ID da patrulha.");
  await setDoc(doc(db, "patrulhas", String(id)), patrulha, { merge: true });
}

export async function atualizarPatrulhaFS(id, patch) {
  await updateDoc(doc(db, "patrulhas", String(id)), patch);
}

export async function lerPatrulhaPorIdFS(id) {
  const ref = doc(db, "patrulhas", String(id));
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
}

export async function excluirPatrulhaFS(id) {
  if (!id) throw new Error("Informe o id da patrulha para excluir.");
  await deleteDoc(doc(db, "patrulhas", String(id)));
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
  const snap = await getDocs(collection(db, "unidades"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function salvarUnidadeFS(unidade) {
  const id = unidade?.id ? String(unidade.id) : gerarIdUnidade(unidade);
  if (!id) throw new Error("ID inválido para unidade.");

  const payload = { ...unidade };
  delete payload.id;

  await setDoc(doc(db, "unidades", id), payload, { merge: true });
  return id;
}

export async function excluirUnidadeFS(id) {
  if (!id) throw new Error("Informe o id da unidade para excluir.");
  await deleteDoc(doc(db, "unidades", String(id)));
}

export async function lerUnidadePorIdFS(id) {
  const ref = doc(db, "unidades", String(id));
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
}

/* =========================
   PMs (extras)
   ========================= */

export async function excluirPmPorReFS(re) {
  const chave = String(re || "").trim();
  if (!chave) throw new Error("Informe o RE para excluir.");
  await deleteDoc(doc(db, "pms", chave));
}
