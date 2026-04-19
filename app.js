import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} 
from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  getDoc
}
from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// ── api do firebase ──
const firebaseConfig = {
  apiKey: "AIzaSyB4YDeZDn6oLfwIFGiEhSS2yFrZEIiNWgM",
  authDomain: "twitter-d8ba9.firebaseapp.com",
  projectId: "twitter-d8ba9",
  storageBucket: "twitter-d8ba9.firebasestorage.app",
  messagingSenderId: "777454510923",
  appId: "1:777454510923:web:6ad40824ce25d6ee29bece"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// username do usuário logado (carregado do Firestore)
let usernameAtual = "";
let nomeAtual = ""

// ── Busca username do usuário no Firestore ──
async function carregarUsername(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (snap.exists()) {
    usernameAtual = snap.data().username;
    nomeAtual = snap.data().nome;
  } else {
    usernameAtual = "";
    nomeAtual = "";
  }
  document.getElementById("usuario-logado").textContent =
  nomeAtual
    ? `${nomeAtual} @${usernameAtual}` 
    : "@" + usernameAtual;
}

// ── Controle de páginas ──
function mostrarFeed(user) {
  document.getElementById("pagina-login").style.display = "none";
  document.getElementById("pagina-feed").style.display = "block";
  document.getElementById("fab").style.display = "flex";
  carregarUsername(user.uid);
}

function mostrarLogin() {
  document.getElementById("pagina-login").style.display = "flex";
  document.getElementById("pagina-feed").style.display = "none";
  document.getElementById("fab").style.display = "none";
}

// ── Observa estado de autenticação ──
onAuthStateChanged(auth, (user) => {
  if (user) {
    mostrarFeed(user);
    carregarFeed();
  } else {
    mostrarLogin();
  }
});

// ── Login / Cadastro ──
window.login = async function () {
  const nome = document.getElementById("nome").value.trim();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    alert("Preencha email e senha!");
    return;
  }

  try {
    // tenta fazer login normalmente
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (e) {
    if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
      // conta não existe — cria uma nova
      if (!username) {
        alert("Para criar uma conta, preencha também o @username!");
        return;
      }
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        // salva o username no Firestore vinculado ao uid
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          nome: nome,
          username: username,
          email: email
        });
      } catch (e2) {
        alert("Erro: " + e2.message);
      }
    } else {
      alert("Erro: " + e.message);
    }
  }
};

// ── Logout ──
window.logout = async function () {
  await signOut(auth);
};

// ── Modal ──
window.abrirModal = function () {
  document.getElementById("modal").classList.add("aberto");
  document.getElementById("tweet").focus();
};

window.fecharModal = function () {
  document.getElementById("modal").classList.remove("aberto");
};

window.fecharModalFora = function (e) {
  if (e.target === document.getElementById("modal")) {
    window.fecharModal();
  }
};

window.atualizarContador = function () {
  const len = document.getElementById("tweet").value.length;
  const el = document.getElementById("contador");
  el.textContent = `${len} / 144`;
  el.className = "char-count" +
    (len >= 144 ? " limite" : len >= 144 ? " perto" : "");
};

// ── Postar ──
window.postar = async function () {
  const texto = document.getElementById("tweet").value.trim();

  if (!texto) {
    alert("Escreva algo antes de postar!");
    return;
  }
  if (!auth.currentUser) {
    alert("Faça login primeiro!");
    return;
  }  

  await addDoc(collection(db, "posts"), {
    texto,
    user: usernameAtual || auth.currentUser.email,
    nome: nomeAtual,
    data: serverTimestamp()
  });

  document.getElementById("tweet").value = "";
  document.getElementById("contador").textContent = "0 / 144";
  window.fecharModal();
};

// ── Feed em tempo real ──
let feedAtivo = false;

function carregarFeed() {
  if (feedAtivo) return;
  feedAtivo = true;

  const q = query(collection(db, "posts"), orderBy("data", "desc"));

  onSnapshot(q, (snapshot) => {
    const feed = document.getElementById("feed");

    if (snapshot.empty) {
      feed.innerHTML = `
        <li class="feed-vazio">
          <i class="fa-regular fa-face-frown" aria-hidden="true"></i> Nenhum post ainda. Seja o primeiro!
        </li>`;
      return;
    }

    feed.innerHTML = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      const li = document.createElement("li");

      const data = p.data?.toDate
        ? p.data.toDate().toLocaleString("pt-BR")
        : "";

      li.innerHTML = `
        <article>
          <p class="post-user">
  <i class="fa-solid fa-user-circle"></i>
  ${p.nome ? `${p.nome} ` : ""}
  <span class="post-username">@${p.user}</span>
</p>
          <p class="post-texto">${p.texto}</p>
          ${data ? `<time class="post-data" datetime="${p.data?.toDate?.().toISOString()}">${data}</time>` : ""}
        </article>
      `;
      feed.appendChild(li);
    });
  });
}
