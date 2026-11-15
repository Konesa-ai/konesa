"use strict";
/* ================================================================
   BABATA PWA — app.js
   Entèfas chat mobil-first : istwa nan localStorage, apèl chat la
   pase nan yon sèl fonksyon sendChat() ki sèvi ak CHAT_API anba a.
   ================================================================ */

/* Konfigirasyon endpoint chat la.
   Si yon jou nou gen pwòp sèvè nou, chanje url la pou /api/chat — rès kòd la pa chanje. */
const CHAT_API = {
  url: "https://nbkllbmfqfkmuyitwdlq.supabase.co/functions/v1/babata-gemini8",
  token: "2704127e9f47c23b75c4945c0b503903b9bb1edd8bd609fd",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ia2xsYm1mcWZrbXV5aXR3ZGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NTYwNzgsImV4cCI6MjExMDIzMjA3OH0.OTpZSGxu-bWY0JaaAzY1CU0LiHiZqjXksG4Ls0ec-gs"
};

const SYSTEM_INSTRUCTION = "Ou se Babata, ajan IA pèsonèl itilizatè a. Reponn an kreyòl ayisyen, klè, itil. Si w pa konnen, di : Sa a, m pa konnen l.";
const WELCOME_TEXT = "Bon, mwen se Babata — ajan pèsonèl ou. Kòman m ka ede w ?";
const ERROR_TEXT = "Dezole, koneksyon an koupe. Verifye entènèt ou epi reeseye.";
const STORE_KEY = "babata_pwa_chats_v1";

/* ---------- Ti zouti ---------- */
function el(id){ return document.getElementById(id); }
function esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function uid(){
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
let toastTimer = null;
function toast(msg){
  const t = el("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
}

/* ---------- Eta + depo (localStorage) ---------- */
let chats = [];
let currentId = null;

function loadChats(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      chats = parsed.filter(c => c && typeof c === "object" && Array.isArray(c.messages));
    }
  } catch(e){ chats = []; }
  if (!chats.length) {
    chats = [newChatObject()];
  }
  const first = chats.find(c => !c.archived) || chats[0];
  currentId = first.id;
}
function saveChats(){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(chats)); } catch(e){}
}
function newChatObject(){
  return { id: uid(), title: "Nouvo chat", archived: false, messages: [] };
}
function currentChat(){
  return chats.find(c => c.id === currentId) || chats[0];
}

/* ---------- Vues (Chat / Fil / Ide / Objektif / Bibliyotèk) ---------- */
let currentView = "chat";
function setView(name){
  currentView = name;
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const view = el("view-" + name);
  if (view) view.classList.add("active");
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  document.querySelectorAll(".drawer-item").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  el("composer").classList.toggle("hidden-composer", name !== "chat");
  if (name === "chat") scrollToBottom();
}

/* ---------- Drawer ---------- */
function openDrawer(){
  el("drawer").classList.add("open");
  el("drawer").setAttribute("aria-hidden", "false");
  el("drawer-overlay").classList.add("open");
  renderChatLists();
}
function closeDrawer(){
  el("drawer").classList.remove("open");
  el("drawer").setAttribute("aria-hidden", "true");
  el("drawer-overlay").classList.remove("open");
}

/* ---------- Afichaj mesaj yo ---------- */
const messagesEl = el("messages");
function scrollToBottom(){
  const view = el("view-chat");
  requestAnimationFrame(() => { view.scrollTop = view.scrollHeight; });
}
function addMessageRow(role, text){
  const row = document.createElement("div");
  row.className = "msg-row " + (role === "user" ? "user" : "bot");
  if (role !== "user") {
    const img = document.createElement("img");
    img.className = "msg-avatar";
    img.src = "icon-512.png";
    img.alt = "Babata";
    row.appendChild(img);
  }
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  return row;
}
function addTypingRow(){
  const row = document.createElement("div");
  row.className = "msg-row bot";
  const img = document.createElement("img");
  img.className = "msg-avatar";
  img.src = "icon-512.png";
  img.alt = "Babata";
  row.appendChild(img);
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = '<span class="typing" aria-label="Babata ap ekri"><span></span><span></span><span></span></span>';
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollToBottom();
  return row;
}
function renderMessages(){
  messagesEl.innerHTML = "";
  const chat = currentChat();
  if (!chat) return;
  if (!chat.messages.length) {
    const row = addMessageRow("bot", WELCOME_TEXT);
    row.querySelector(".bubble").classList.add("welcome");
  } else {
    chat.messages.forEach(m => addMessageRow(m.role, m.text));
  }
  scrollToBottom();
}

/* ---------- Lis diskisyon yo nan drawer a ---------- */
function renderChatLists(){
  const q = el("chat-search").value.trim().toLowerCase();
  const match = c => !q || String(c.title || "").toLowerCase().indexOf(q) !== -1;
  fillChatList(el("chat-list"), chats.filter(c => !c.archived && match(c)));
  const archived = chats.filter(c => c.archived && match(c));
  fillChatList(el("archived-list"), archived);
  el("archived-title").style.display = archived.length ? "" : "none";
}
function fillChatList(ul, list){
  ul.innerHTML = "";
  if (!list.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Okenn diskisyon.";
    ul.appendChild(li);
    return;
  }
  list.forEach(chat => {
    const li = document.createElement("li");
    if (chat.id === currentId) li.className = "current";
    const titleBtn = document.createElement("button");
    titleBtn.className = "chat-title";
    titleBtn.type = "button";
    titleBtn.textContent = chat.title || "Nouvo chat";
    titleBtn.addEventListener("click", () => {
      currentId = chat.id;
      renderMessages();
      setView("chat");
      closeDrawer();
    });
    const archBtn = document.createElement("button");
    archBtn.className = "archive-btn";
    archBtn.type = "button";
    archBtn.textContent = "🗄";
    archBtn.setAttribute("aria-label", chat.archived ? "Desachive" : "Achive");
    archBtn.title = chat.archived ? "Desachive" : "Achive";
    archBtn.addEventListener("click", () => {
      chat.archived = !chat.archived;
      saveChats();
      renderChatLists();
    });
    li.appendChild(titleBtn);
    li.appendChild(archBtn);
    ul.appendChild(li);
  });
}

/* ---------- Konstwi prompt la (enstriksyon + istorik + nouvo mesaj) ---------- */
function clipTurn(s){
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > 700 ? s.slice(0, 700) + "…" : s;
}
function buildPrompt(chat, newText){
  const hist = chat.messages.slice(-20).map(m =>
    (m.role === "user" ? "ITILIZATÈ : " : "BABATA : ") + clipTurn(m.text)
  ).join("\n");
  return SYSTEM_INSTRUCTION + "\n\n" +
    (hist ? "ISTORIK KONVÈSASYON AKTYÈL LA — dènye echanj yo, nan lòd yo te pase a. Sèvi avè l : sonje sa ki te di deja, epi reponn nan kontèks la :\n" + hist + "\n\n" : "") +
    "NOUVO MESAJ ITILIZATÈ A :\n" + newText;
}

/* ---------- Voye / Stop ---------- */
const sendBtn = el("send-btn");
const input = el("chat-input");
let currentRun = null;

function setSendingUI(on){
  if (on) {
    sendBtn.textContent = "■";
    sendBtn.classList.add("stop");
    sendBtn.setAttribute("aria-label", "Kanpe");
  } else {
    sendBtn.textContent = "➤";
    sendBtn.classList.remove("stop");
    sendBtn.setAttribute("aria-label", "Voye");
  }
}
function typewrite(fullText, bubble, run){
  return new Promise(resolve => {
    let pos = bubble.textContent.length;
    if (pos >= fullText.length) { resolve(); return; }
    run.typeTimer = setInterval(() => {
      pos = Math.min(fullText.length, pos + 12);
      bubble.textContent = fullText.slice(0, pos);
      scrollToBottom();
      if (pos >= fullText.length) {
        clearInterval(run.typeTimer);
        run.typeTimer = null;
        resolve();
      }
    }, 15);
    run.stopType = () => {
      if (run.typeTimer) { clearInterval(run.typeTimer); run.typeTimer = null; }
      resolve();
    };
  });
}

async function sendChat(prompt){
  const run = { controller: new AbortController(), typeTimer: null, stopType: null };
  currentRun = run;
  setSendingUI(true);
  const typingRow = addTypingRow();
  let botRow = null, botBubble = null, finalText = "";
  try {
    const res = await fetch(CHAT_API.url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + CHAT_API.anonKey,
        "apikey": CHAT_API.anonKey,
        "x-babata-token": CHAT_API.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: prompt }),
      signal: run.controller.signal
    });
    if (!res.ok) {
      let serverMsg = "";
      try {
        const d = await res.json();
        if (d && typeof d.error === "string") serverMsg = d.error;
      } catch(e){}
      throw new Error(serverMsg || "HTTP " + res.status);
    }
    typingRow.remove();
    botRow = addMessageRow("bot", "");
    botBubble = botRow.querySelector(".bubble");
    let fullText = "";
    if (res.body && typeof res.body.getReader === "function") {
      /* Streaming : li chunk pa chunk. Si se tèks brit, montre l
         pwogresivman ; si se JSON {text}, tann l konplè epi fè efè
         machin ekri a sou li. */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", isJson = null;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buf += decoder.decode(chunk.value, { stream: true });
        if (isJson === null) isJson = buf.trim().charAt(0) === "{";
        if (!isJson) { botBubble.textContent = buf; scrollToBottom(); }
      }
      buf += decoder.decode();
      if (isJson) {
        const data = JSON.parse(buf);
        fullText = (data && typeof data.text === "string") ? data.text : "";
        await typewrite(fullText, botBubble, run);
      } else {
        fullText = buf;
      }
    } else {
      const data = await res.json();
      fullText = (data && typeof data.text === "string") ? data.text : "";
      await typewrite(fullText, botBubble, run);
    }
    finalText = botBubble.textContent || fullText;
  } catch (e) {
    if (typingRow.isConnected) typingRow.remove();
    if (run.controller.signal.aborted) {
      /* Stop : kenbe tèks ki deja parèt la. */
      finalText = botBubble ? botBubble.textContent : "";
      if (!finalText && botRow) botRow.remove();
    } else {
      const msg = (e && typeof e.message === "string" && e.message && !/^HTTP \d+$/.test(e.message) && !/fetch/i.test(e.message))
        ? e.message : ERROR_TEXT;
      if (!botRow) { botRow = addMessageRow("bot", msg); botBubble = botRow.querySelector(".bubble"); }
      else botBubble.textContent = msg;
      finalText = msg;
    }
  } finally {
    if (run.typeTimer) { clearInterval(run.typeTimer); run.typeTimer = null; }
    setSendingUI(false);
    if (currentRun === run) currentRun = null;
    if (finalText) {
      const chat = currentChat();
      chat.messages.push({ role: "bot", text: finalText, ts: Date.now() });
      saveChats();
    }
    scrollToBottom();
  }
}
function stopRun(){
  if (!currentRun) return;
  if (currentRun.stopType) currentRun.stopType();
  try { currentRun.controller.abort(); } catch(e){}
}

/* ---------- Fòmilè a ---------- */
el("composer").addEventListener("submit", e => {
  e.preventDefault();
  if (currentRun) { stopRun(); return; }
  const text = input.value.trim();
  if (!text) return;
  const chat = currentChat();
  const prompt = buildPrompt(chat, text);
  const isFirstUserMsg = !chat.messages.some(m => m.role === "user");
  chat.messages.push({ role: "user", text: text, ts: Date.now() });
  if (isFirstUserMsg) chat.title = text.slice(0, 30);
  saveChats();
  /* Retire bul akèy la si l te la (chat vid), apre ajoute mesaj la. */
  if (chat.messages.length === 1) messagesEl.innerHTML = "";
  addMessageRow("user", text);
  scrollToBottom();
  input.value = "";
  autoGrow();
  renderChatLists();
  sendChat(prompt);
});
sendBtn.addEventListener("click", e => {
  if (currentRun) { e.preventDefault(); stopRun(); }
});
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    el("composer").requestSubmit();
  }
});
function autoGrow(){
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
}
input.addEventListener("input", autoGrow);

/* ---------- Mikwo (menm lojik ak v5 la) ---------- */
(function(){
  const micBtn = el("mic-btn");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { micBtn.hidden = true; return; }
  let activeRec = null;
  let triedFallback = false;
  function setRecUI(on){
    micBtn.classList.toggle("recording", on);
    micBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function startRec(lang){
    const r = new SR();
    activeRec = r;
    r.lang = lang;
    r.interimResults = false;
    r.continuous = false;
    r.onresult = function(ev){
      let txt = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) txt += ev.results[i][0].transcript;
      }
      txt = txt.trim();
      if (!txt) return;
      const cur = input.value.replace(/\s+$/, "");
      input.value = cur ? cur + " " + txt : txt;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    };
    r.onerror = function(ev){
      if (ev && ev.error === "language-not-supported" && !triedFallback) {
        triedFallback = true;
        startRec("fr-FR");
        return;
      }
      if (activeRec === r) { activeRec = null; setRecUI(false); }
    };
    r.onend = function(){
      if (activeRec === r) { activeRec = null; setRecUI(false); }
    };
    try { r.start(); setRecUI(true); }
    catch(e){ if (activeRec === r) activeRec = null; setRecUI(false); }
  }
  micBtn.addEventListener("click", function(){
    if (activeRec) {
      const r = activeRec;
      activeRec = null;
      setRecUI(false);
      try { r.stop(); } catch(e){}
      return;
    }
    triedFallback = false;
    startRec("ht-HT");
  });
})();

/* ---------- Bouton + navigasyon ---------- */
el("menu-btn").addEventListener("click", openDrawer);
el("drawer-close").addEventListener("click", closeDrawer);
el("drawer-overlay").addEventListener("click", closeDrawer);
el("gift-btn").addEventListener("click", () => toast("Byento — seksyon sa a ap vini. 🎁"));
el("plus-btn").addEventListener("click", () => toast("Byento — seksyon sa a ap vini."));
document.querySelectorAll(".tab").forEach(t =>
  t.addEventListener("click", () => setView(t.dataset.view)));
document.querySelectorAll(".drawer-item").forEach(t =>
  t.addEventListener("click", () => { setView(t.dataset.view); closeDrawer(); }));
el("chat-search").addEventListener("input", renderChatLists);
el("new-chat-btn").addEventListener("click", () => {
  const chat = newChatObject();
  chats.unshift(chat);
  currentId = chat.id;
  saveChats();
  renderMessages();
  renderChatLists();
  setView("chat");
  closeDrawer();
  input.focus();
});

/* ---------- Paramèt ---------- */
el("settings-btn").addEventListener("click", () => {
  closeDrawer();
  el("settings-panel").classList.remove("hidden");
});
el("settings-close").addEventListener("click", () =>
  el("settings-panel").classList.add("hidden"));
el("settings-panel").addEventListener("click", e => {
  if (e.target === el("settings-panel")) el("settings-panel").classList.add("hidden");
});
el("wipe-btn").addEventListener("click", () => {
  try { localStorage.removeItem(STORE_KEY); } catch(e){}
  chats = [newChatObject()];
  currentId = chats[0].id;
  saveChats();
  renderMessages();
  renderChatLists();
  el("settings-panel").classList.add("hidden");
  toast("Istwa a efase.");
});

/* ---------- Demaraj ---------- */
loadChats();
renderMessages();
renderChatLists();
setView("chat");
autoGrow();

/* Service worker (enstalasyon PWA + offline) */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("sw.js").catch(function(){});
  });
}
