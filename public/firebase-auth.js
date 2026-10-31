import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsAwUplm90XLCh-n60XXF1Dz37w8akcYU",
  authDomain: "studio-3607214974-ad41a.firebaseapp.com",
  projectId: "studio-3607214974-ad41a",
  storageBucket: "studio-3607214974-ad41a.firebasestorage.app",
  messagingSenderId: "798171833576",
  appId: "1:798171833576:web:99eb4457fd8a96dc4d155d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
window.AppForgeFirebaseReady = new Promise(resolve => onAuthStateChanged(auth, resolve));

async function establish(user) {
  const idToken = await user.getIdToken();
  const response = await fetch("/auth/firebase-session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not start your AppForgeAI session.");
  return data;
}

window.AppForgeFirebase = {
  async login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return establish(result.user);
  },
  async register({ email, password, firstName, lastName }) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: (firstName + " " + lastName).trim() });
    return establish(result.user);
  },
  async google() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return establish(result.user);
    } catch (error) {
      const code = error?.code || "";
      if (code === "auth/popup-blocked") {
        await signInWithRedirect(auth, provider);
        return { redirect: true };
      }
      throw error;
    }
  },
  async restoreRedirect() {
    const result = await getRedirectResult(auth);
    if (result?.user) return establish(result.user);
    return null;
  }
};