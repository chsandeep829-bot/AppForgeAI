const $=s=>document.querySelector(s);
let project={files:[]}, user=null; let projects=[]; let currentProjectId=null;

function keysFrom(text){return [...new Set((text||"").split(/[\n,]+/).map(x=>x.trim()).filter(Boolean).map(x=>x.includes("=")?x.slice(x.indexOf("=")+1).trim():x).filter(Boolean))]}
function apiKeys(){return {groq:keysFrom(sessionStorage.getItem("af_groq")||""),gemini:keysFrom(sessionStorage.getItem("af_gemini")||"")}}

function message(text,who="ai"){
  const log=$("#chatLog"); if(!log)return;
  const d=document.createElement("div"); d.className="msg "+who; d.textContent=text; log.append(d); log.scrollTop=log.scrollHeight;
}

async function init(){
  try{
    const r=await fetch("/auth/me",{credentials:"same-origin"});
    const d=await r.json(); user=d.user||null;
  }catch(e){console.error("Session check failed",e)}
  if(user){
    $("#loginScreen").classList.add("hidden");
    $("#appShell").classList.remove("hidden");
    const box=$("#userBox");
    box.textContent="";
    if(user.picture){const img=document.createElement("img");img.src=user.picture;img.alt="";box.append(img)}
    const name=document.createElement("span");name.textContent=user.name||user.email;box.append(name);
    const out=document.createElement("a");out.href="/auth/logout";out.textContent="Sign out";box.append(out);
    $("#groqKeys").value="";
    $("#geminiKeys").value="";
    if(d.admin){$("#adminPanel").classList.remove("hidden");loadAdminApks()}
    loadApks(); loadProjects();
  }else{
    $("#loginScreen").classList.remove("hidden");
    $("#appShell").classList.add("hidden");
  }
}

document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".nav,.tab").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  $("#"+b.dataset.tab).classList.add("active");
}));

function saveProjects(){localStorage.setItem("appforge_projects",JSON.stringify(projects))}
function loadProjects(){try{projects=JSON.parse(localStorage.getItem("appforge_projects")||"[]")}catch{projects=[]}renderProjectCards()}
function renderProjectCards(){const box=$("#projectCards"),empty=$("#emptyProjects");if(!box)return;box.textContent="";if(!projects.length){empty.classList.remove("hidden");return}empty.classList.add("hidden");projects.forEach(p=>{const c=document.createElement("button");c.className="projectCard";c.innerHTML="<span class=\"projectIcon\">✦</span><strong></strong><small></small>";c.querySelector("strong").textContent=p.name;c.querySelector("small").textContent=p.updated?"Updated "+new Date(p.updated).toLocaleDateString():"New project";c.onclick=()=>openProject(p.id);box.append(c)})}
function showNewProject(){ $("#projectHome").classList.add("hidden");$("#projectDetail").classList.add("hidden");$("#newProjectView").classList.remove("hidden");$("#prompt").focus() }
function showProjectHome(){ $("#newProjectView").classList.add("hidden");$("#projectDetail").classList.add("hidden");$("#projectHome").classList.remove("hidden");renderProjectCards() }
function openProject(id){const p=projects.find(x=>x.id===id);if(!p)return;currentProjectId=id;project=p.data||{files:[]};$("#detailProjectName").textContent=p.name;$("#previewTitle").textContent=p.name+" Preview";$("#projectHome").classList.add("hidden");$("#newProjectView").classList.add("hidden");$("#projectDetail").classList.remove("hidden");render(project)}
function persistCurrent(){const p=projects.find(x=>x.id===currentProjectId);if(p){p.data=project;p.updated=Date.now();saveProjects()}}
function render(x){
  project=x||{files:[]}; $("#files").innerHTML=""; $("#fileCount").textContent=(project.files||[]).length;
  (project.files||[]).forEach((f,i)=>{
    const b=document.createElement("button");b.className="file";b.textContent=f.path;
    b.onclick=()=>{$("#fileTitle").textContent=f.path;$("#output").textContent=f.content};
    $("#files").append(b);if(i===0)b.click();
  });
  const html=(project.files||[]).find(f=>f.path.endsWith("index.html"))?.content||"<h2>Preview unavailable</h2>";
  const css=(project.files||[]).find(f=>f.path.endsWith(".css"))?.content||"";
  const script=(project.files||[]).find(f=>f.path.endsWith(".js"))?.content||"";
  $("#previewFrame").srcdoc=html.replace("</head>","<style>"+css.replace(/<\/style/gi,"")+"</style></head>").replace("</body>","<script>"+script.replace(/<\/script/gi,"")+"</script></body>");
}

async function build(prompt,edit=false){
  const provider=$("#provider").value, own=apiKeys()[provider];
  if(!prompt?.trim()){ $("#status").textContent="Describe the app you want to build."; return; }
  
  $("#generate").disabled=true;$("#status").textContent=edit?"Editing app…":"Building app…";$("#buildDetail").textContent="AI is generating your project files…";message(edit?"Editing your project…":"Build started…");
  try{
    const full=edit?prompt+"\n\nCurrent files:\n"+JSON.stringify(project.files):prompt;
    const r=await fetch("/api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:full,provider,apiKeys:{[provider]:own}})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Build failed");render(d.result);$("#status").textContent="Build complete";$("#buildDetail").textContent=(project.files||[]).length+" files generated · ready to preview";$("#projectName").textContent=d.result.projectName||"Untitled project";message("Build complete. Open Preview or ask for another edit.");
  }catch(e){$("#status").textContent="Build failed";message("Error: "+e.message)}finally{$("#generate").disabled=false}
}

$("#newProject").onclick=showNewProject;$("#emptyNewProject").onclick=showNewProject;$("#backProjects").onclick=showProjectHome;$("#closeProject").onclick=showProjectHome;
$("#generate").onclick=async()=>{const name=$("#newProjectName").value.trim();if(!name){$("#newProjectName").focus();return}const id=Date.now().toString();currentProjectId=id;projects.push({id,name,data:{files:[]},updated:Date.now()});saveProjects();await build($("#prompt").value);persistCurrent();$("#newProjectName").value="";$("#detailProjectName").textContent=name;$("#previewTitle").textContent=name+" Preview";$("#newProjectView").classList.add("hidden");$("#projectDetail").classList.remove("hidden")};
document.querySelectorAll(".idea").forEach(b=>b.onclick=()=>{$("#prompt").value=b.textContent+" with a premium modern design, responsive pages and realistic interactions.";$("#prompt").focus()});
$("#copyCode").onclick=async()=>{try{await navigator.clipboard.writeText($("#output").textContent);$("#copyCode").textContent="✓";setTimeout(()=>$("#copyCode").textContent="▣",1200)}catch{}};
$("#refreshPreview").onclick=()=>render(project);
$("#sendChat").onclick=async()=>{const v=$("#chatInput").value.trim();if(!v)return;message(v,"user");$("#chatInput").value="";await build(v,true);persistCurrent()};
document.querySelectorAll(".projectTab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".projectTab,.projectPanel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#"+b.dataset.projectTab).classList.add("active")});

$("#saveKeys").onclick=async()=>{const provider=$("#provider").value;const text=$(provider==="groq"?"#groqKeys":"#geminiKeys").value;const keys=keysFrom(text);if(!keys.length){$("#apiMessage").textContent="Add at least one key for the selected provider.";return}$("#apiMessage").textContent="Saving securely…";try{const r=await fetch("/api/keys/save",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider,keys})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Save failed");sessionStorage.setItem("af_"+provider,text);$("#apiMessage").textContent=provider+" keys saved securely to your account ("+d.keyCount+" key(s))."}catch(e){$("#apiMessage").textContent="Save failed: "+e.message}};

async function testProvider(provider){
  const keys=keysFrom($(provider==="groq"?"#groqKeys":"#geminiKeys").value);
  $("#apiMessage").textContent="Testing "+provider+"…";
  try{
    const r=await fetch("/api/test-provider",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider,keys})});
    const d=await r.json();if(!r.ok)throw new Error(d.error);$("#apiMessage").textContent=provider+" connected successfully with "+d.keyCount+" key(s).";
  }catch(e){$("#apiMessage").textContent="Test failed: "+e.message}
}
$("#testGroq").onclick=()=>testProvider("groq");
$("#testGemini").onclick=()=>testProvider("gemini");

$("#verifyCF").onclick=async()=>{
  $("#cfResult").textContent="Checking…";
  try{
    const r=await fetch("/api/cloudflare/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:$("#cfToken").value})});
    const d=await r.json();if(!r.ok)throw new Error(d.error);$("#cfResult").textContent="Cloudflare token verified: "+(d.status||"active");
  }catch(e){$("#cfResult").textContent="Verification failed: "+e.message}
};

async function loadApks(){const box=$("#apkList");try{const r=await fetch("/api/apks");const d=await r.json();box.textContent="";if(!d.releases?.length){box.textContent="No APK releases available yet.";return}d.releases.forEach(x=>{const row=document.createElement("div");row.className="card";const a=document.createElement("a");a.href=x.download_url;a.textContent="Download "+x.title+(x.version?" v"+x.version:"");a.target="_blank";a.rel="noopener";row.append(a);if(x.notes){const p=document.createElement("p");p.textContent=x.notes;row.append(p)}box.append(row)})}catch{box.textContent="Could not load APK releases."}}
async function loadAdminApks(){const box=$("#adminApkList");try{const r=await fetch("/api/admin/apks");const d=await r.json();box.textContent="";(d.releases||[]).forEach(x=>{const row=document.createElement("div");const t=document.createElement("span");t.textContent=x.title+" "+(x.version||"");const del=document.createElement("button");del.textContent="Remove";del.onclick=async()=>{await fetch("/api/admin/apks/"+x.id,{method:"DELETE"});loadAdminApks();loadApks()};row.append(t,del);box.append(row)})}catch{}}
$("#addApk").onclick=async()=>{const payload={title:$("#apkTitle").value,version:$("#apkVersion").value,downloadUrl:$("#apkUrl").value,notes:$("#apkNotes").value};$("#adminMessage").textContent="Publishing…";try{const r=await fetch("/api/admin/apks",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Failed");$("#adminMessage").textContent="APK download published.";["#apkTitle","#apkVersion","#apkUrl","#apkNotes"].forEach(s=>$(s).value="");loadAdminApks();loadApks()}catch(e){$("#adminMessage").textContent=e.message}};
let authMode="login",turnstileWidget=null,turnstileReady=false;
function setAuthMode(mode){
  authMode=mode;
  const register=mode==="register";
  $("#registerFields").classList.toggle("hidden",!register);
  $("#loginBtn").classList.toggle("hidden",register);
  $("#registerBtn").classList.toggle("hidden",!register);
  $("#switchAuth").innerHTML=register?"Already have an account? <strong>Sign in</strong>":"New here? <strong>Create an account</strong>";
  $("#authMessage").textContent="";
}
async function setupTurnstile(){
  try{
    const r=await fetch("/auth/turnstile-config",{credentials:"same-origin"});
    const d=await r.json();
    if(!d.siteKey){$("#turnstileBox").style.display="none";return;}
    if(document.querySelector('script[data-appforge-turnstile]'))return;
    const script=document.createElement("script");
    script.dataset.appforgeTurnstile="true";
    script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async=true;
    script.onload=()=>{
      try{
        turnstileWidget=window.turnstile.render("#turnstileBox",{sitekey:d.siteKey,theme:"dark"});
        turnstileReady=true;
      }catch(e){$("#authMessage").textContent="Security verification could not start. Please refresh and try again.";}
    };
    script.onerror=()=>{$("#authMessage").textContent="Could not load security verification. Check your connection and refresh."};
    document.head.append(script);
  }catch{}
}
function authPayload(){
  return {
    username:$("#authUsername")?.value.trim()||"",
    firstName:$("#authFirstName")?.value.trim()||"",
    lastName:$("#authLastName")?.value.trim()||"",
    email:$("#authEmail").value.trim(),
    password:$("#authPassword").value,
    turnstileToken:turnstileReady&&window.turnstile&&turnstileWidget!==null?window.turnstile.getResponse(turnstileWidget):""
  };
}
async function emailAuth(mode){
  const payload=authPayload();
  if(!payload.email||!payload.password){$("#authMessage").textContent="Enter your email and password.";return;}
  if(mode==="register"&&(!payload.username||!payload.firstName||!payload.lastName)){$("#authMessage").textContent="Complete your username, first name and last name.";return;}
  const buttons=[$("#loginBtn"),$("#registerBtn")];
  buttons.forEach(b=>b.disabled=true);
  $("#authMessage").textContent=mode==="register"?"Creating your account…":"Signing in…";
  try{
    const r=await fetch("/auth/"+mode,{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||"Authentication failed");
    $("#authMessage").textContent=mode==="register"?"Account created. Opening your dashboard…":"Signed in. Opening your dashboard…";
    await init();
  }catch(e){
    $("#authMessage").textContent=e instanceof Error?e.message:"Authentication failed. Please try again.";
  }finally{
    buttons.forEach(b=>b.disabled=false);
    if(turnstileReady&&window.turnstile&&turnstileWidget!==null){
      try{window.turnstile.reset(turnstileWidget)}catch{}
    }
  }
}
$("#loginBtn").onclick=()=>emailAuth("login");
$("#registerBtn").onclick=()=>emailAuth("register");
$("#switchAuth").onclick=()=>setAuthMode(authMode==="login"?"register":"login");
setAuthMode("login");
setupTurnstile();
init();
$("#publishProject").onclick=()=>{document.querySelector('[data-tab="settingsTab"]').click();alert("Connect your Cloudflare details in Settings. Project publishing will use the selected project.");};
$("#domainProject").onclick=()=>{document.querySelector('[data-tab="settingsTab"]').click();alert("Custom domain settings are available in the Publish connection area.");};
$("#githubProject").onclick=()=>alert("GitHub project publishing connection is the next deployment step for this workspace.");