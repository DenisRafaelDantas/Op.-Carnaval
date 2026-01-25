// js/logout.js
import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const btnSair = document.getElementById("btnSair");

if (btnSair) {
  btnSair.addEventListener("click", async () => {
    const confirmar = window.confirm("Deseja realmente sair do sistema?");
    if (!confirmar) return;

    try {
      await signOut(auth);
      // guard-admin.js vai redirecionar automaticamente
      // mas garantimos aqui também
      window.location.href = "index.html";
    } catch (erro) {
      console.error("Erro ao sair:", erro);
      alert("Não foi possível sair. Tente novamente.");
    }
  });
}
