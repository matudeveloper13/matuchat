import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjrDMHeulPmO-HbZ43-TlD0-sgAcpXFcQ",
  authDomain: "simplechat-e1787.firebaseapp.com",
  projectId: "simplechat-e1787",
  storageBucket: "simplechat-e1787.firebasestorage.app",
  messagingSenderId: "469168057769",
  appId: "1:469168057769:web:d7f37ceae7b6d8227c28b8",
  measurementId: "G-KDWQTRWZSQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authModalBtn = document.getElementById("auth-modal-btn");
const logoutBtn = document.getElementById("logout-btn");
const currentUserText = document.getElementById("current-user-text");
const authOverlay = document.getElementById("auth-overlay");
const closeModalBtn = document.getElementById("close-modal-btn");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authError = document.getElementById("auth-error");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");

const makeEmail = (username) => `${username.toLowerCase().trim()}@simplechat.com`;
const makeSecurePass = (pass) => `sc_${pass}_pad123`;

authModalBtn?.addEventListener("click", () => authOverlay.classList.remove("hidden"));
closeModalBtn?.addEventListener("click", () => authOverlay.classList.add("hidden"));
logoutBtn?.addEventListener("click", () => signOut(auth));

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;
  try {
    await createUserWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
    authOverlay.classList.add("hidden");
  } catch (err) {
    authError.textContent = err.message;
  }
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  try {
    await signInWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
    authOverlay.classList.add("hidden");
  } catch (err) {
    authError.textContent = "Invalid credentials.";
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    const username = user.email.split("@")[0];
    currentUserText.textContent = username;
    authModalBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    currentUserText.textContent = "Guest";
    authModalBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
});

messageForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !auth.currentUser) return;
  const username = auth.currentUser.email.split("@")[0];

  messageInput.value = "";
  await addDoc(collection(db, "messages"), {
    text,
    username,
    timestamp: serverTimestamp()
  });
});

const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  messagesContainer.innerHTML = "";
  snapshot.forEach(docSnap => {
    const msg = docSnap.data();
    const div = document.createElement("div");
    div.className = "msg";
    div.innerHTML = `<strong>${msg.username}</strong>: ${msg.text}`;
    messagesContainer.appendChild(div);
  });
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
});