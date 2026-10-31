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
function authMessage(text){const el=document.querySelector("#authMessage");if(el)el.textContent=text||"";}
async function enterWorkspace(){document.querySelector("#authScreen")?.classList.add("hidden");document.querySelector("#appShell")?.classList.remove("hidden");window.dispatchEvent(new Event("appforge-authenticated"));}
document.addEventListener("DOMContentLoaded",()=>{
 const $=s=>document.querySelector(s);
 const registerFields=$("#registerFields"),login=$("#emailLogin"),register=$("#emailRegister"),cancel=$("#cancelRegister");
 let registerMode=false;
 function setMode(on){
   registerMode=on;registerFields?.classList.toggle("hidden",!on);cancel?.classList.toggle("hidden",!on);
   $("#authTitle").textContent=on?"Create your AppForgeAI account":"Welcome to AppForgeAI";
   $("#authSubtitle").textContent=on?"Enter your details to create your workspace.":"Sign in to continue building real apps with AI.";
   login.classList.toggle("hidden",on);register.textContent=on?"Create account":"Create account";
   $("#authPassword").setAttribute("autocomplete",on?"new-password":"current-password");authMessage("");
 }
 register?.addEventListener("click",async()=>{
   if(!registerMode){setMode(true);$("#authFirstName")?.focus();return;}
   try{
     const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
     const firstName=$("#authFirstName").value.trim(),lastName=$("#authLastName").value.trim();
     if(!firstName||!lastName||!email||!password){authMessage("Please enter your first name, last name, email and password.");return;}
     if(password.length<6){authMessage("Password must contain at least 6 characters.");return;}
     authMessage("Creating your account…");
     await window.AppForgeFirebase.register({email,password,firstName,lastName});
   }catch(e){authMessage(e.message||"Account creation failed.");}
 });
 cancel?.addEventListener("click",()=>setMode(false));
 login?.addEventListener("click",async()=>{try{
   const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
   if(!email||!password){authMessage("Enter your email and password.");return;}
   authMessage("Signing in…");await window.AppForgeFirebase.login(email,password);
 }catch(e){authMessage(e.message||"Sign in failed.")}});
 $("#googleLogin")?.addEventListener("click",async()=>{try{authMessage("Opening Google…");await window.AppForgeFirebase.google()}catch(e){authMessage(e.message||"Google sign-in failed.")}});
 window.AppForgeFirebaseReady.then(async u=>{try{if(u){await window.AppForgeFirebase.restoreRedirect().catch(()=>{});const r=await fetch("/auth/firebase-session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idToken:await u.getIdToken()})});if(r.ok)await enterWorkspace()}}catch{}});
});