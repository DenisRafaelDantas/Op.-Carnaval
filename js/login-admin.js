// js/login-admin.js
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const form = document.getElementById("formLogin");
const inputRe = document.getElementById("re");
const inputSenha = document.getElementById("senha");
const msg = document.getElementById("msg");
const btnEntrar = document.getElementById("btnEntrar");

function normalizarRe(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 6);
}

function reParaEmail(re) {
  return `${re}@pmesp.local`;
}

function mostrarErro(texto) {
  msg.textContent = texto;
  msg.classList.remove("d-none");
}

function limparErro() {
  msg.classList.add("d-none");
  msg.textContent = "";
}

// Se já estiver logado, vai direto
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "principal.html";
});

// Segurança: se por algum motivo o form não existir, evita crash silencioso
if (!form) {
  console.error("formLogin não encontrado no HTML.");
} else {
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // <- isso impede o reload
    limparErro();

    btnEntrar.disabled = true;

    try {
      const re = normalizarRe(inputRe.value);

      if (re.length !== 6) {
        mostrarErro("RE inválido. Digite 6 números.");
        return;
      }

      const email = reParaEmail(re);
      const senha = inputSenha.value;

      await signInWithEmailAndPassword(auth, email, senha);

      // se autenticou, redireciona
      window.location.href = "principal.html";
    } catch (err) {
      // Mostra o erro real no console e uma mensagem pro usuário
      console.error(err);

      // Se for domínio não autorizado, já te direciona no diagnóstico
      if (String(err?.code || "").includes("auth/unauthorized-domain")) {
        mostrarErro("Domínio não autorizado no Firebase. Autorize localhost/127.0.0.1 nos domínios do Auth.");
      } else {
        mostrarErro("Falha no login. Verifique RE e senha.");
      }
    } finally {
      btnEntrar.disabled = false;
    }
  });
}
