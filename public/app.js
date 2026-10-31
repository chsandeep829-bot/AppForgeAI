const $=s=>document.querySelector(s);
let project={files:[]}, user=null;
// Remember the last successful account locally for a friendlier next visit. Authentication remains in the secure HttpOnly session cookie.
const LAST_LOGIN_KEY="appforgeai_last_login"; let projects=[]; let currentProjectId=null;

function keysFrom(text){return [...new Set((text||"").split(/[\n,]+/).map(x=>x.trim()).filter(Boolean).map(x=>x.includes("=")?x.slice(x.indexOf("=")+1).trim():x).filter(Boolean))]}
function apiKeys(){return {groq:[],gemini:[]}}

function message(text,who="ai"){
  const log=$("#chatLog"); if(!log)return;
  const d=document.createElement("div"); d.className="msg "+who; d.textContent=text; log.append(d); log.scrollTop=log.scrollHeight;
}

async function init(){
  // Restore a real Firebase account silently when the user has already signed in.
  try {
    if (window.AppForgeFirebaseReady) {
      const firebaseUser = await window.AppForgeFirebaseReady;
      if (firebaseUser) await window.AppForgeFirebase.restoreRedirect().catch(()=>{});
      const me = await fetch("/auth/me",{credentials:"same-origin"}).then(r=>r.json()).catch(()=>({}));
      user = me.user || (firebaseUser ? {name:firebaseUser.displayName||"AppForgeAI User",email:firebaseUser.email||""} : {name:"AppForgeAI User",email:""});
    } else user={name:"AppForgeAI User",email:""};
  } catch { user={name:"AppForgeAI User",email:""}; }
  const shell=$("#appShell");
  if(shell)shell.classList.remove("hidden");
  const box=$("#userBox");
  if(box){box.textContent="";const name=document.createElement("span");name.textContent=user.email||"Workspace";box.append(name);}
  const admin=$("#adminPanel");
  if(admin)admin.classList.add("hidden");
  loadApks();
  loadProjects();
}

document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".nav,.tab").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  $("#"+b.dataset.tab).classList.add("active");
}));

async function saveProjects(){if(!user?.email)return; const p=projects.find(x=>x.id===currentProjectId);if(p)await fetch("/api/projects/"+encodeURIComponent(p.id),{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:p.name,status:p.status||"ready",data:p.data||{}})});}
async function loadProjects(){if(!user?.email){projects=[];renderProjectCards();return}try{const r=await fetch("/api/projects");const d=await r.json();if(!r.ok)throw new Error(d.error);projects=d.projects||[];}catch{projects=[]}renderProjectCards()}
function renderProjectCards(){const count=document.querySelector(".navCount");if(count)count.textContent=projects.length;const box=$("#projectCards"),empty=$("#emptyProjects");if(!box)return;box.textContent="";if(!projects.length){empty.classList.remove("hidden");return}empty.classList.add("hidden");projects.forEach(p=>{const c=document.createElement("button");c.className="projectCard";c.innerHTML="<span class=\"projectIcon\">✦</span><strong></strong><small></small>";c.querySelector("strong").textContent=p.name;c.querySelector("small").textContent=p.updated?"Updated "+new Date(p.updated).toLocaleDateString():"New project";c.onclick=()=>openProject(p.id);box.append(c)})}
function showNewProject(){ $("#projectHome").classList.add("hidden");$("#projectDetail").classList.add("hidden");$("#newProjectView").classList.remove("hidden");$("#prompt").focus() }
function showProjectHome(){ $("#newProjectView").classList.add("hidden");$("#projectDetail").classList.add("hidden");$("#projectHome").classList.remove("hidden");renderProjectCards() }
function openProject(id){const p=projects.find(x=>x.id===id);if(!p)return;currentProjectId=id;project=p.data||{files:[]};$("#detailProjectName").textContent=p.name;$("#previewTitle").textContent=p.name+" Preview";$("#projectHome").classList.add("hidden");$("#newProjectView").classList.add("hidden");$("#projectDetail").classList.remove("hidden");render(project)}
async function persistCurrent(status="ready"){const p=projects.find(x=>x.id===currentProjectId);if(p){p.data=project;p.status=status;p.updated=Date.now();await saveProjects();}}
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
  const provider=$("#provider").value;
  if(!prompt?.trim()){ $("#status").textContent="Describe the app you want to build."; return; }
  
  $("#generate").disabled=true;$("#status").textContent=edit?"Editing app…":"Building app…";const bd=$("#buildDetail");if(bd)bd.textContent="AI is generating your project files…";message(edit?"Editing your project…":"Build started…");
  try{
    const full=edit?prompt+"\n\nCurrent files:\n"+JSON.stringify(project.files):prompt;
    const r=await fetch("/api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:full,provider,generationMode:$("#generationMode")?.value||"auto/best-fast"})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Build failed");
    if(!d.result||!Array.isArray(d.result.files))throw new Error("The AI returned an incomplete project. Please try again.");
    render(d.result);persistCurrent();
    $("#status").textContent="Build complete";if(bd)bd.textContent=(project.files||[]).length+" files generated · ready to preview";const pn=$("#projectName");if(pn)pn.textContent=d.result.projectName||"Untitled project";message("Build complete. Open Preview or ask for another edit.");
  }catch(e){$("#status").textContent="Build failed";message("Error: "+e.message)}finally{$("#generate").disabled=false}
}

$("#newProject").onclick=showNewProject;$("#newProjectSide").onclick=showNewProject;$("#emptyNewProject").onclick=showNewProject;$("#backProjects").onclick=showProjectHome;$("#closeProject").onclick=showProjectHome;
$("#generate").onclick=async()=>{const name=$("#newProjectName").value.trim();if(!name){$("#newProjectName").focus();return}if(!user?.email){alert("Please sign in before creating a private project.");return}const created=await fetch("/api/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,prompt:$("#prompt").value})}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d.project});const id=created.id;currentProjectId=id;projects.push({...created,data:{files:[]},updated:Date.now()});await build($("#prompt").value);if(!project.files?.length){projects=projects.filter(p=>p.id!==id);await fetch("/api/projects/"+encodeURIComponent(id),{method:"DELETE"});return;}persistCurrent();$("#newProjectName").value="";$("#detailProjectName").textContent=name;$("#previewTitle").textContent=name+" Preview";$("#newProjectView").classList.add("hidden");$("#projectDetail").classList.remove("hidden")};
document.querySelectorAll(".idea").forEach(b=>b.onclick=()=>{$("#prompt").value=b.textContent+" with a premium modern design, responsive pages and realistic interactions.";$("#prompt").focus()});
$("#copyCode").onclick=async()=>{try{await navigator.clipboard.writeText($("#output").textContent);$("#copyCode").textContent="✓";setTimeout(()=>$("#copyCode").textContent="▣",1200)}catch{}};
$("#refreshPreview").onclick=()=>render(project);
$("#sendChat").onclick=async()=>{const v=$("#chatInput").value.trim();if(!v)return;message(v,"user");$("#chatInput").value="";await build(v,true);persistCurrent()};
document.querySelectorAll(".projectTab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".projectTab,.projectPanel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#"+b.dataset.projectTab).classList.add("active")});

$("#saveKeys").onclick=async()=>{
  if(!user?.email){$("#apiMessage").textContent="Please sign in before saving provider settings.";return}
  const providers=[
    {provider:"groq",keys:keysFrom($("#groqKeys").value)},
    {provider:"gemini",keys:keysFrom($("#geminiKeys").value)}
  ].filter(x=>x.keys.length);
  if(!providers.length){$("#apiMessage").textContent="Add at least one API key.";return}
  $("#apiMessage").textContent="Saving securely…";
  try{
    const results=[];
    for(const item of providers){
      const r=await fetch("/api/keys/save",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(item)});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Save failed");results.push(item.provider+" ("+d.keyCount+" keys)");
    }
    $("#groqKeys").value="";$("#geminiKeys").value="";
    $("#apiMessage").textContent="Saved securely: "+results.join(", ")+". Keys are not kept in browser storage.";
  }catch(e){$("#apiMessage").textContent="Save failed: "+e.message}
};

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

if($("#verifyCF")) $("#verifyCF").onclick=async()=>{
  $("#cfResult").textContent="Checking…";
  try{
    const r=await fetch("/api/cloudflare/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:$("#cfToken").value})});
    const d=await r.json();if(!r.ok)throw new Error(d.error);$("#cfResult").textContent="Cloudflare token verified: "+(d.status||"active");
  }catch(e){$("#cfResult").textContent="Verification failed: "+e.message}
};

async function loadApks(){const box=$("#apkList");try{const r=await fetch("/api/apks");const d=await r.json();box.textContent="";if(!d.releases?.length){box.textContent="No APK releases available yet.";return}d.releases.forEach(x=>{const row=document.createElement("div");row.className="card";const a=document.createElement("a");a.href=x.download_url;a.textContent="Download "+x.title+(x.version?" v"+x.version:"");a.target="_blank";a.rel="noopener";row.append(a);if(x.notes){const p=document.createElement("p");p.textContent=x.notes;row.append(p)}box.append(row)})}catch{box.textContent="Could not load APK releases."}}
async function loadAdminApks(){const box=$("#adminApkList");try{const r=await fetch("/api/admin/apks");const d=await r.json();box.textContent="";(d.releases||[]).forEach(x=>{const row=document.createElement("div");const t=document.createElement("span");t.textContent=x.title+" "+(x.version||"");const del=document.createElement("button");del.textContent="Remove";del.onclick=async()=>{await fetch("/api/admin/apks/"+x.id,{method:"DELETE"});loadAdminApks();loadApks()};row.append(t,del);box.append(row)})}catch{}}
$("#addApk").onclick=async()=>{const payload={title:$("#apkTitle").value,version:$("#apkVersion").value,downloadUrl:$("#apkUrl").value,notes:$("#apkNotes").value};$("#adminMessage").textContent="Publishing…";try{const r=await fetch("/api/admin/apks",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Failed");$("#adminMessage").textContent="APK download published.";["#apkTitle","#apkVersion","#apkUrl","#apkNotes"].forEach(s=>$(s).value="");loadAdminApks();loadApks()}catch(e){$("#adminMessage").textContent=e.message}};
$("#publishProject").onclick=()=>{document.querySelector('[data-tab="settingsTab"]').click();alert("Connect your Cloudflare details in Settings. Project publishing will use the selected project.");};
$("#domainProject").onclick=()=>{document.querySelector('[data-tab="settingsTab"]').click();alert("Custom domain settings are available in the Publish connection area.");};
$("#githubProject").onclick=()=>alert("GitHub project publishing connection is the next deployment step for this workspace.");


// Start after Firebase restores any previous signed-in account.
init();

/* Mobile drawer controller: sidebar is fixed and never occupies main content width. */
(function(){
 const toggle=$("#mobileMenuToggle"), drawer=document.querySelector(".sidebar"), backdrop=$("#drawerBackdrop");
 if(!toggle||!drawer||!backdrop)return;
 const close=()=>{drawer.classList.remove("drawerOpen");backdrop.classList.remove("open");toggle.setAttribute("aria-expanded","false");};
 const open=()=>{drawer.classList.add("drawerOpen");backdrop.classList.add("open");toggle.setAttribute("aria-expanded","true");};
 toggle.onclick=()=>drawer.classList.contains("drawerOpen")?close():open();
 backdrop.onclick=close;
 drawer.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{if(window.innerWidth<=800)close()}));
 window.addEventListener("resize",()=>{if(window.innerWidth>800)close()});
})();