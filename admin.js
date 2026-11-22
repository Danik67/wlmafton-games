const configured = window.SUPABASE_URL && !window.SUPABASE_URL.includes("YOUR-PROJECT")
  && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
const setupWarning = document.getElementById("setupWarning");
const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");
const formMessage = document.getElementById("formMessage");
let db = null;
let currentUser = null;
let editing = false;

function msg(el, text, isError=false) {
  el.textContent = text;
  el.classList.remove("hidden","error");
  if (isError) el.classList.add("error");
}
function esc(v) { return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

if (configured && window.supabase?.createClient) {
  db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  setupWarning.classList.add("hidden");
} else {
  msg(setupWarning, "Не настроено подключение к Supabase. Заполни SUPABASE_URL и SUPABASE_ANON_KEY в supabase-config.js. Не используй service_role key.", true);
}

async function verifyAdmin() {
  const {data:{user}} = await db.auth.getUser();
  currentUser = user;
  if (!user) { showLogin(); return; }
  const {data, error} = await db.from("admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if (error || !data) {
    await db.auth.signOut();
    showLogin();
    msg(loginMessage, "У этой учётной записи нет прав администратора. Добавь её UUID в таблицу admins согласно инструкции.", true);
    return;
  }
  showDashboard();
  await loadGames();
}
function showLogin(){loginPanel.classList.remove("hidden");dashboard.classList.add("hidden");logoutBtn.classList.add("hidden");}
function showDashboard(){loginPanel.classList.add("hidden");dashboard.classList.remove("hidden");logoutBtn.classList.remove("hidden");}

document.getElementById("loginForm").addEventListener("submit", async e=>{
  e.preventDefault(); if(!db)return;
  const {error}=await db.auth.signInWithPassword({email:document.getElementById("email").value,password:document.getElementById("password").value});
  if(error){msg(loginMessage,error.message,true);return;}
  await verifyAdmin();
});
logoutBtn.addEventListener("click",async()=>{await db.auth.signOut();showLogin();});
document.getElementById("cancelEdit").addEventListener("click",resetForm);

async function loadGames(){
  const list=document.getElementById("gamesList");
  const {data,error}=await db.from("games").select("*").order("created_at",{ascending:false});
  if(error){list.textContent="Ошибка загрузки: "+error.message;return;}
  if(!data.length){list.textContent="Пока нет добавленных игр.";return;}
  list.innerHTML=data.map(g=>`<div class="admin-item"><div><b>${esc(g.title)}</b><small>${esc(g.genre)} · ${g.published?"Опубликована":"Черновик"}</small></div><div class="admin-actions"><button class="admin-btn secondary" data-edit="${g.id}">Изменить</button><button class="admin-btn danger" data-delete="${g.id}">Удалить</button></div></div>`).join("");
  list.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editGame(data.find(g=>g.id===b.dataset.edit))));
  list.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteGame(b.dataset.delete)));
}
function editGame(g){
  editing=true;document.getElementById("formTitle").textContent="РЕДАКТИРОВАТЬ ИГРУ";
  document.getElementById("gameId").value=g.id;
  for(const key of ["title","genre","status","code","description"])document.getElementById(key).value=g[key]||"";
  document.getElementById("downloadUrl").value=g.download_url||"";
  document.getElementById("published").checked=!!g.published;
  document.getElementById("cancelEdit").classList.remove("hidden");
  document.getElementById("formTitle").scrollIntoView({behavior:"smooth",block:"center"});
}
function resetForm(){
  document.getElementById("gameForm").reset();document.getElementById("gameId").value="";
  document.getElementById("formTitle").textContent="ДОБАВИТЬ ИГРУ";document.getElementById("cancelEdit").classList.add("hidden");editing=false;
}
async function deleteGame(id){
  if(!confirm("Точно удалить эту игру из каталога?"))return;
  const {error}=await db.from("games").delete().eq("id",id);
  if(error){msg(formMessage,error.message,true);return;}await loadGames();
}
document.getElementById("gameForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!db)return;
  const submit=e.submitter;submit.disabled=true;submit.textContent="СОХРАНЕНИЕ...";
  try{
    let download_url=document.getElementById("downloadUrl").value.trim();
    const file=document.getElementById("gameFile").files[0];
    if(file){
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const path=`${currentUser.id}/${crypto.randomUUID()}-${safeName}`;
      const {error:uploadError}=await db.storage.from("game-files").upload(path,file,{upsert:false});
      if(uploadError)throw uploadError;
      const {data}=db.storage.from("game-files").getPublicUrl(path);
      download_url=data.publicUrl;
    }
    const record={
      title:document.getElementById("title").value.trim(),
      genre:document.getElementById("genre").value.trim(),
      status:document.getElementById("status").value,
      code:document.getElementById("code").value.trim(),
      description:document.getElementById("description").value.trim(),
      download_url,
      published:document.getElementById("published").checked
    };
    const id=document.getElementById("gameId").value;
    const result=id?await db.from("games").update(record).eq("id",id):await db.from("games").insert(record);
    if(result.error)throw result.error;
    msg(formMessage,"Игра сохранена.");
    resetForm();await loadGames();
  }catch(err){msg(formMessage,"Не удалось сохранить: "+err.message,true);}
  finally{submit.disabled=false;submit.textContent="СОХРАНИТЬ ИГРУ";}
});
if(db)verifyAdmin();