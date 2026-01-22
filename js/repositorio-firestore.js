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
  addDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =========================
   LEITURA (operação e admin)
   ========================= */

export async function lerPmsFS() {
  const snap = await getDocs(collection(db, "pms"));
  return snap.docs.map((d) => d.data());
}

export async function lerPatrulhasFS() {
  const snap = await getDocs(collection(db, "patrulhas"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
