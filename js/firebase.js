// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Config do seu projeto
const firebaseConfig = {
  apiKey: "AIzaSyAHOtMh4qLdOiLaKspIcmQqScubOUrKMhM",
  authDomain: "op-carnaval-pmesp.firebaseapp.com",
  projectId: "op-carnaval-pmesp",
  storageBucket: "op-carnaval-pmesp.firebasestorage.app",
  messagingSenderId: "706577200301",
  appId: "1:706577200301:web:7a69f3640582ab51908224",
  measurementId: "G-PDW5LZQ26Y"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
