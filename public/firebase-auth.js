import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/*
 Firebase web configuration is public by design. For production, optionally inject
 window.__APPFORGE_FIREBASE_CONFIG__ before this module loads. Do not put service
 account credentials or private API secrets in the browser.
*/
const fallbackConfig={
  apiKey:"AIzaSyDsAwUplm90XLCh-n60XXF1Dz37w8akcYU",
  authDomain:"studio-3607214974-ad41a.firebaseapp.com",
  projectId:"studio-3607214974-ad41a",
  storageBucket:"studio-3607214974-ad41a.firebasestorage.app",
  messagingSenderId:"798171833576",
  appId:"1:798171833576:web:99eb4457fd8a96dc4d155d"
};
const firebaseConfig={...fallbackConfig,...(window.__APPFORGE_FIREBASE_CONFIG__||{})};
for(const key of ["apiKey","authDomain","projectId","appId"]){
  if(!firebaseConfig[key]) throw new Error("AppForgeAI Firebase configuration is missing "+key+".");
}

const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
const auth=getAuth(app);
// Persist the Firebase session across refreshes and browser restarts until the user explicitly logs out.
await setPersistence(auth,browserLocalPersistence);
const provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:"select_account"});
let sessionPromise=null;
let authRestoreStarted=false;
let dashboardStartPromise=null;

function authMessage(text){const el=document.querySelector("#authMessage");if(el)el.textContent=text||"";}
function setBusy(id,busy,label){const el=document.querySelector(id);if(!el)return;el.disabled=busy;if(label)el.dataset.label=el.dataset.label||el.textContent,el.textContent=busy?label:el.dataset.label;}
async function establish(user){
  if(!user) return null;
  if(sessionPromise) return sessionPromise;
  sessionPromise=(async()=>{
    const idToken=await user.getIdToken(true);
    const response=await fetch("/auth/firebase-session",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({idToken})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||"Firebase login succeeded, but the AppForgeAI server session could not be started.");
    return data;
  })();
  try{return await sessionPromise;}finally{sessionPromise=null;}
}
async function completeSignIn(user){
  if(!user) return null;
  if(dashboardStartPromise) return dashboardStartPromise;
  dashboardStartPromise=(async()=>{
    await establish(user);
    await enterWorkspace(user);
    return user;
  })();
  try{return await dashboardStartPromise;}finally{dashboardStartPromise=null;}
}
async function enterWorkspace(user){
  window.__APPFORGE_AUTH_INTENT=true;
  const screen=document.querySelector("#authScreen");
  const shell=document.querySelector("#appShell");
  screen?.classList.add("hidden");
  if(screen) screen.setAttribute("aria-hidden","true");
  shell?.classList.remove("hidden");
  shell?.setAttribute("aria-hidden","false");
  if(window.AppForgeDashboard?.start) await window.AppForgeDashboard.start(user);
  window.dispatchEvent(new CustomEvent("appforge-authenticated",{detail:{user}}));
}

window.AppForgeFirebase={
  auth,
  async logout(){ authRestoreStarted=true; dashboardStartPromise=null; sessionPromise=null; await fetch("/auth/logout",{method:"POST",credentials:"same-origin"}).catch(()=>{}); await signOut(auth); window.__APPFORGE_AUTH_INTENT=false; authRestoreStarted=false; document.querySelector("#appShell")?.classList.add("hidden"); const screen=document.querySelector("#authScreen"); screen?.classList.remove("hidden"); screen?.removeAttribute("aria-hidden"); },
  async login(email,password){window.__APPFORGE_AUTH_INTENT=true;const result=await signInWithEmailAndPassword(auth,email,password);await completeSignIn(result.user);return result.user;},
  async register({email,password,firstName,lastName}){window.__APPFORGE_AUTH_INTENT=true;const result=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(result.user,{displayName:(firstName+" "+lastName).trim()});await completeSignIn(result.user);return result.user;},
  async google(){
    window.__APPFORGE_AUTH_INTENT=true;
    auth.useDeviceLanguage();
    try{const result=await signInWithPopup(auth,provider);await completeSignIn(result.user);return result.user;}
    catch(error){
      const code=error?.code||"";
      if(["auth/popup-blocked","auth/popup-closed-by-user","auth/cancelled-popup-request"].includes(code)){
        await signInWithRedirect(auth,provider);return {redirect:true};
      }
      if(code==="auth/network-request-failed"){ await signInWithRedirect(auth,provider); return {redirect:true}; }
      throw error;
    }
  },
  async restoreRedirect(){const result=await getRedirectResult(auth);if(result?.user){window.__APPFORGE_AUTH_INTENT=true;await completeSignIn(result.user);return result.user;}return null;}
};

// This observer is the single source of truth for authentication state.
window.AppForgeFirebaseReady=new Promise(resolve=>{
  let first=true;
  onAuthStateChanged(auth,async user=>{
    if(first){first=false;resolve(user);}
    // Firebase keeps the user's session across refreshes. Restore the workspace
    // automatically for that same authenticated user. Only an explicit Log out ends it.
    if(!user) return;
    // Restore the same authenticated account after refresh without showing the login screen.
    if(authRestoreStarted) return;
    authRestoreStarted=true;
    window.__APPFORGE_AUTH_INTENT=true;
    try{
      await completeSignIn(user);
    }catch(error){
      authRestoreStarted=false;
      console.error("AppForgeAI session setup failed",error);
      authMessage(error?.message||"Could not start your AppForgeAI session. Check the Worker secrets.");
    }
  });
});

document.addEventListener("DOMContentLoaded",()=>{
  const $=s=>document.querySelector(s);
  const registerFields=$("#registerFields"),login=$("#emailLogin"),register=$("#emailRegister"),cancel=$("#cancelRegister");
  let registerMode=false;
  function setMode(on){
    registerMode=on;registerFields?.classList.toggle("hidden",!on);cancel?.classList.toggle("hidden",!on);
    $("#authTitle").textContent=on?"Create your AppForgeAI account":"Welcome back";
    $("#authSubtitle").textContent=on?"Enter your details to create your workspace.":"Sign in to continue building with AI.";
    login?.classList.toggle("hidden",on);register.textContent=on?"Create account":"Create an account";
    $("#authPassword")?.setAttribute("autocomplete",on?"new-password":"current-password");authMessage("");
  }
  register?.addEventListener("click",async()=>{
    if(!registerMode){setMode(true);$("#authFirstName")?.focus();return;}
    try{const email=$("#authEmail").value.trim(),password=$("#authPassword").value,firstName=$("#authFirstName").value.trim(),lastName=$("#authLastName").value.trim();
      if(!firstName||!lastName||!email||!password)throw new Error("Please complete all fields.");
      if(password.length<6)throw new Error("Password must contain at least 6 characters.");
      setBusy("#emailRegister",true,"Creating account…");await window.AppForgeFirebase.register({email,password,firstName,lastName});
    }catch(e){authMessage(e?.message||"Account creation failed.");}finally{setBusy("#emailRegister",false);}
  });
  cancel?.addEventListener("click",()=>setMode(false));
  login?.addEventListener("click",async e=>{e.preventDefault();try{const email=$("#authEmail").value.trim(),password=$("#authPassword").value;if(!email||!password)throw new Error("Enter your email and password.");setBusy("#emailLogin",true,"Signing in…");await window.AppForgeFirebase.login(email,password);}catch(e){authMessage(e?.message||"Sign in failed.");}finally{setBusy("#emailLogin",false);}});
  $("#googleLogin")?.addEventListener("click",async()=>{try{authMessage("");setBusy("#googleLogin",true,"Connecting…");await window.AppForgeFirebase.google();}catch(e){authMessage(e?.message||"Google sign-in failed.");}finally{setBusy("#googleLogin",false);}});
  window.AppForgeFirebase.restoreRedirect().catch(e=>authMessage(e?.message||"Could not finish Google sign-in."));
});