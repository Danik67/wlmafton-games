const grid = document.getElementById("gamesGrid");
const emptyNote = document.getElementById("emptyNote");
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function renderGames(items) {
  if (!items || !items.length) {
    grid.innerHTML = "";
    emptyNote.hidden = false;
    emptyNote.textContent = "Скоро здесь появятся наши первые игры. Следи за обновлениями!";
    return;
  }
  emptyNote.hidden = true;
  grid.innerHTML = items.map((game, index) => {
    const hasDownload = Boolean(game.download_url || game.download);
    const href = game.download_url || game.download || "";
    const action = hasDownload
      ? `<a class="game-download" href="${escapeHtml(href)}" target="_blank" rel="noopener">СКАЧАТЬ ИГРУ <span>↓</span></a>`
      : `<span class="game-download disabled">СКОРО <span>↗</span></span>`;
    return `<article class="game-card">
      <div class="game-cover"><span class="cover-tag">${escapeHtml(game.status || "PROJECT")}</span><span class="cover-code">${escapeHtml(game.code || "WA_0" + (index+1))}</span><span class="cover-index">PROJECT / ${String(index+1).padStart(2,"0")}</span></div>
      <div class="game-info"><div class="game-meta"><span>${escapeHtml(game.genre || "PC GAME")}</span><span>WLM / AFTON</span></div><h3>${escapeHtml(game.title)}</h3><p>${escapeHtml(game.description)}</p>${action}</div>
    </article>`;
  }).join("");
}
async function loadPublicGames() {
  const configured = window.SUPABASE_URL && !window.SUPABASE_URL.includes("YOUR-PROJECT")
    && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  if (configured && window.supabase?.createClient) {
    try {
      const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      const { data, error } = await client.from("games").select("*").eq("published", true).order("created_at", {ascending:false});
      if (error) throw error;
      renderGames(data);
      return;
    } catch (e) {
      console.warn("Не удалось загрузить игры из базы. Показываем демо-карточки.", e.message);
    }
  }
  renderGames(games);
}
loadPublicGames();
document.getElementById("year").textContent = new Date().getFullYear();
const toggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");
toggle.addEventListener("click", () => {
  const opened = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(opened));
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}));