import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const config={apiKey:"AIzaSyDsAwUplm90XLCh-n60XXF1Dz37w8akcYU",authDomain:"studio-3607214974-ad41a.firebaseapp.com",projectId:"studio-3607214974-ad41a",storageBucket:"studio-3607214974-ad41a.firebasestorage.app",messagingSenderId:"798171833576",appId:"1:798171833576:web:99eb4457fd8a96dc4d155d"};
const app=initializeApp(config),auth=getAuth(app);
async function establish(user){const idToken=await user.getIdToken();const r=await fetch("/auth/firebase-session",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({idToken})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Could not create your AppForgeAI session.");return d;}
window.AppForgeFirebase={
 async login(email,password){const c=await signInWithEmailAndPassword(auth,email,password);return establish(c.user);},
 async register({email,password,firstName,lastName}){const c=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(c.user,{displayName:(firstName+" "+lastName).trim()});return establish(c.user);},
 async google(){const c=await signInWithPopup(auth,new GoogleAuthProvider());return establish(c.user);}
};