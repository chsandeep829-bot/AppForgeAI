import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const firebaseConfig={apiKey:"AIzaSyDsAwUplm90XLCh-n60XXF1Dz37w8akcYU",authDomain:"studio-3607214974-ad41a.firebaseapp.com",projectId:"studio-3607214974-ad41a",storageBucket:"studio-3607214974-ad41a.firebasestorage.app",messagingSenderId:"798171833576",appId:"1:798171833576:web:99eb4457fd8a96dc4d155d"};
const app=getApps().length?getApps()[0]:initializeApp({...firebaseConfig,...(window.__APPFORGE_FIREBASE_CONFIG__||{})});
const auth=getAuth(app);
const provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:"select_account"});

let starting=null;
let restoreHandled=false;
const authMessage=(text="")=>{const el=document.querySelector("#authMessage");if(el)el.textContent=text;};
function setBusy(selector,busy,busyText){const el=document.querySelector(selector);if(!el)return;if(!el.dataset.original)el.dataset.original=el.textContent;el.disabled=busy;el.textContent=busy&&busyText?busyText:el.dataset.original;}

async function startWorkspace(user){
  if(!user) throw new Error("No authenticated user was returned.");
  if(starting) return starting;
  starting=(async()=>{
    const token=await user.getIdToken();
    const response=await fetch("/auth/firebase-session",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({idToken:token})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||"Could not start the AppForgeAI session.");
    window.__APPFORGE_AUTH_INTENT=true;
    document.querySelector("#authScreen")?.classList.add("hidden");
    document.querySelector("#authScreen")?.setAttribute("aria-hidden","true");
    document.querySelector("#appShell")?.classList.remove("hidden");
    document.querySelector("#appShell")?.setAttribute("aria-hidden","false");
    if(window.AppForgeDashboard?.start) await window.AppForgeDashboard.start(user);
    window.dispatchEvent(new CustomEvent("appforge-authenticated",{detail:{user}}));
    return user;
  })();
  try{return await starting;}finally{starting=null;}
}

window.AppForgeFirebase={
  auth,
  async login(email,password){const result=await signInWithEmailAndPassword(auth,email,password);return startWorkspace(result.user);},
  async register({email,password,firstName,lastName}){const result=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(result.user,{displayName:(firstName+" "+lastName).trim()});return startWorkspace(result.user);},
  async google(){
    try{return await startWorkspace((await signInWithPopup(auth,provider)).user);}
    catch(error){
      if(["auth/popup-blocked","auth/popup-closed-by-user","auth/cancelled-popup-request","auth/network-request-failed"].includes(error?.code)){
        await signInWithRedirect(auth,provider);
        return null;
      }
      throw error;
    }
  },
  async logout(){
    await fetch("/auth/logout",{method:"POST",credentials:"same-origin"}).catch(()=>{});
    await signOut(auth);
    window.__APPFORGE_AUTH_INTENT=false;
    document.querySelector("#appShell")?.classList.add("hidden");
    document.querySelector("#authScreen")?.classList.remove("hidden");
    document.querySelector("#authScreen")?.removeAttribute("aria-hidden");
  }
};

async function restoreExistingUser(){
  try{await setPersistence(auth,browserLocalPersistence);}catch(error){console.warn("Local Firebase persistence unavailable",error);}
  try{
    const redirectResult=await getRedirectResult(auth);
    if(redirectResult?.user){restoreHandled=true;await startWorkspace(redirectResult.user);return;}
  }catch(error){authMessage(error?.message||"Google sign-in could not be completed.");}
  onAuthStateChanged(auth,async user=>{
    if(!user||restoreHandled)return;
    restoreHandled=true;
    try{await startWorkspace(user);}catch(error){restoreHandled=false;authMessage(error?.message||"Could not restore your session.");}
  });
}

function bindLoginUI(){
  const $=s=>document.querySelector(s);
  const login=$("#emailLogin"),register=$("#emailRegister"),cancel=$("#cancelRegister");
  let registerMode=false;
  const setMode=on=>{
    registerMode=on;
    $("#registerFields")?.classList.toggle("hidden",!on);
    cancel?.classList.toggle("hidden",!on);
    $("#authTitle").textContent=on?"Create your AppForgeAI account":"Welcome back";
    $("#authSubtitle").textContent=on?"Enter your details to create your workspace.":"Sign in to continue building with AI.";
    login?.classList.toggle("hidden",on);
    register.textContent=on?"Create account":"Create an account";
    $("#authPassword")?.setAttribute("autocomplete",on?"new-password":"current-password");
    authMessage();
  };
  register?.addEventListener("click",async e=>{
    e.preventDefault();
    if(!registerMode){setMode(true);$("#authFirstName")?.focus();return;}
    try{
      const email=$("#authEmail").value.trim(),password=$("#authPassword").value,firstName=$("#authFirstName").value.trim(),lastName=$("#authLastName").value.trim();
      if(!firstName||!lastName||!email||!password) throw new Error("Please complete all fields.");
      if(password.length<6) throw new Error("Password must contain at least 6 characters.");
      setBusy("#emailRegister",true,"Creating account…");
      await window.AppForgeFirebase.register({email,password,firstName,lastName});
    }catch(error){authMessage(error?.message||"Account creation failed.");}finally{setBusy("#emailRegister",false);}
  });
  cancel?.addEventListener("click",e=>{e.preventDefault();setMode(false);});
  login?.addEventListener("click",async e=>{
    e.preventDefault();
    try{
      const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
      if(!email||!password) throw new Error("Enter your email and password.");
      setBusy("#emailLogin",true,"Signing in…");
      await window.AppForgeFirebase.login(email,password);
    }catch(error){authMessage(error?.message||"Sign in failed.");}finally{setBusy("#emailLogin",false);}
  });
  $("#googleLogin")?.addEventListener("click",async e=>{
    e.preventDefault();
    try{authMessage();setBusy("#googleLogin",true,"Connecting…");await window.AppForgeFirebase.google();}
    catch(error){authMessage(error?.message||"Google sign-in failed.");}
    finally{setBusy("#googleLogin",false);}
  });
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bindLoginUI,{once:true}); else bindLoginUI();
restoreExistingUser();
