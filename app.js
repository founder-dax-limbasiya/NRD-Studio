const STORE_KEY = "nrd-studio-v1";
const DB_NAME = "nrd-studio-media";
const DB_VERSION = 1;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const emptyState = { drafts: [], planned: [] };
let state = loadState();
let toastTimer;

function loadState() {
  try { return { ...emptyState, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") }; }
  catch { return { ...emptyState }; }
}
function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  renderAll();
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
function timeLabel(value) {
  return new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric" }).format(new Date(value));
}
function navigate(page) {
  $$(".page").forEach(node => node.classList.toggle("active", node.id === `page-${page}`));
  $$("[data-page]").forEach(node => node.classList.toggle("active", node.dataset.page === page));
  const labels = { home:"Overview", studio:"Content studio", library:"Media library", calendar:"Planner", channels:"Channels", settings:"Settings" };
  $("#pageCrumb").textContent = labels[page] || "Overview";
  window.location.hash = page;
  window.scrollTo({ top:0, behavior:"smooth" });
}
$$("[data-page]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.page)));
$$("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
const initialPage = location.hash.slice(1);
if ($("#page-" + initialPage)) navigate(initialPage);

function renderDashboard() {
  $("#draftCount").textContent = state.drafts.length;
  $("#plannedCount").textContent = state.planned.length;
  $("#recentGrid").innerHTML = state.drafts.length
    ? state.drafts.slice(0,3).map(draft => `<article class="draft-card"><div class="draft-meta"><span>${escapeHTML(draft.platform)}</span><span class="draft-tag">${escapeHTML(draft.format)}</span></div><h3>${escapeHTML(draft.title || "Untitled draft")}</h3><p>${escapeHTML(draft.body || "No script added yet.")}</p><div class="draft-meta"><span>Edited ${timeLabel(draft.updatedAt)}</span><span>${draft.body.trim().split(/\s+/).filter(Boolean).length} words</span></div><div class="draft-actions"><button class="small-action" data-edit="${draft.id}">Open draft</button><button class="small-action" data-plan="${draft.id}">Plan</button></div></article>`).join("")
    : '<div class="empty-card"><span class="empty-icon">✳</span><b>Your next idea starts here</b><p>Create a draft to see it appear in your workspace.</p><button class="secondary-button" data-go="studio">Create first draft</button></div>';
  $("#recentGrid").querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => openDraft(button.dataset.edit)));
  $("#recentGrid").querySelectorAll("[data-plan]").forEach(button => button.addEventListener("click", () => planDraft(button.dataset.plan)));
  $("#recentGrid").querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
}
function renderPlanned() {
  const list = $("#plannedList");
  const planned = [...state.planned].sort((a,b) => new Date(a.date) - new Date(b.date));
  list.innerHTML = planned.length ? planned.map(item => {
    const draft = state.drafts.find(d => d.id === item.draftId);
    const date = new Date(item.date + "T12:00:00");
    return `<div class="planned-row"><div class="date-chip">${date.getDate()}<small>${date.toLocaleString(undefined,{month:"short"})}</small></div><div><b>${escapeHTML(draft?.title || "Saved content")}</b><small>${escapeHTML(draft?.platform || "Content")} · Reminder only — not scheduled with the platform</small></div></div>`;
  }).join("") : '<div class="empty-inline">Nothing planned yet. Save a draft and add a reminder date to organise it here.</div>';
}
function renderAll() {
  renderDashboard();
  renderPlanned();
  $("#wordCount").textContent = `${$("#contentIdea").value.trim().split(/\s+/).filter(Boolean).length} words`;
  renderAssets();
}
function draftFromEditor() {
  return {
    id: $("#editingId").value || crypto.randomUUID(),
    title: $("#contentTitle").value.trim() || "Untitled draft",
    platform: $("#platformSelect").value,
    format: $("#formatSelect").value,
    body: $("#contentIdea").value.trim(),
    updatedAt: new Date().toISOString()
  };
}
function saveDraft() {
  const draft = draftFromEditor();
  const index = state.drafts.findIndex(item => item.id === draft.id);
  if (index >= 0) state.drafts[index] = draft;
  else state.drafts.unshift(draft);
  $("#editingId").value = draft.id;
  persist();
  showToast("Draft saved on this device");
}
$("#saveDraftButton").addEventListener("click", saveDraft);
$("#contentIdea").addEventListener("input", () => {
  $("#wordCount").textContent = `${$("#contentIdea").value.trim().split(/\s+/).filter(Boolean).length} words`;
});
function openDraft(id) {
  const draft = state.drafts.find(item => item.id === id);
  if (!draft) return;
  $("#editingId").value = draft.id;
  $("#contentTitle").value = draft.title;
  $("#platformSelect").value = draft.platform;
  $("#formatSelect").value = draft.format;
  $("#contentIdea").value = draft.body;
  $("#wordCount").textContent = `${draft.body.trim().split(/\s+/).filter(Boolean).length} words`;
  navigate("studio");
}
function planDraft(id) {
  const draft = state.drafts.find(item => item.id === id);
  if (!draft) return;
  const date = prompt("Add a reminder date (YYYY-MM-DD). This will not publish the post automatically.");
  if (!date) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date + "T12:00:00").getTime())) {
    showToast("Use a date like 2026-12-05");
    return;
  }
  state.planned = state.planned.filter(item => item.draftId !== id);
  state.planned.push({ id:crypto.randomUUID(), draftId:id, date });
  persist();
  navigate("calendar");
  showToast("Reminder added to your planner");
}
$("#outlineButton").addEventListener("click", () => {
  const raw = $("#contentIdea").value.trim();
  if (!raw) { showToast("Add an idea or script first"); return; }
  const sentences = raw.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const steps = [
    { title:"Opening hook", text:sentences[0] || raw },
    { title:"Main point", text:sentences.length > 1 ? sentences.slice(1, Math.max(2, sentences.length - 1)).join(" ") : "Explain the main idea with one clear example." },
    { title:"Closing thought", text:sentences.length > 2 ? sentences[sentences.length - 1] : "End with a useful takeaway or a simple call to action." }
  ];
  $("#outlineContent").innerHTML = steps.map((step,index) => `<div class="outline-item"><b>0${index + 1} · ${step.title}</b><p>${escapeHTML(step.text)}</p></div>`).join("");
  $("#outlinePanel").hidden = false;
  $("#outlinePanel").scrollIntoView({ behavior:"smooth", block:"nearest" });
  showToast("Local outline created — no AI service used");
});

function srtTime(milliseconds) {
  const value = Math.max(0, milliseconds);
  const hours = Math.floor(value / 3600000);
  const minutes = Math.floor((value % 3600000) / 60000);
  const seconds = Math.floor((value % 60000) / 1000);
  const millis = value % 1000;
  return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")},${String(millis).padStart(3,"0")}`;
}
$("#exportSrtButton").addEventListener("click", () => {
  const script = $("#contentIdea").value.trim();
  if (!script) { showToast("Add a script before exporting subtitles"); return; }
  const lines = script.split(/(?<=[.!?])\\s+|\\n+/).map(line => line.trim()).filter(Boolean);
  const srt = lines.map((line,index) => {
    const start = index * 3500;
    const end = start + 3000;
    return `${index + 1}\\n${srtTime(start)} --> ${srtTime(end)}\\n${line}`;
  }).join("\\n\\n");
  const blob = new Blob([srt], { type:"application/x-subrip;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${($("#contentTitle").value.trim() || "nrd-captions").replace(/[^a-z0-9-_]+/gi,"-")}.srt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("SRT draft exported — adjust timings to match your final audio");
});

$("#closeOutline").addEventListener("click", () => $("#outlinePanel").hidden = true);
function resetEditor() {
  $("#editingId").value = "";
  $("#contentTitle").value = "";
  $("#contentIdea").value = "";
  $("#platformSelect").value = "Instagram";
  $("#formatSelect").value = "Short video";
  $("#wordCount").textContent = "0 words";
  $("#outlinePanel").hidden = true;
}
const newContent = document.querySelectorAll('[data-go="studio"]');
newContent.forEach(button => button.addEventListener("click", () => {
  if (button.id !== "keepDraft") resetEditor();
}));
function dbOpen() {
  return new Promise((resolve,reject) => {
    if (!("indexedDB" in window)) return reject(new Error("Browser storage is not available"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath:"id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveAsset(file) {
  const db = await dbOpen();
  const asset = { id:crypto.randomUUID(), name:file.name, type:file.type || "application/octet-stream", size:file.size, addedAt:new Date().toISOString(), blob:file };
  await new Promise((resolve,reject) => {
    const tx = db.transaction("assets","readwrite");
    tx.objectStore("assets").put(asset);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
async function getAssets() {
  try {
    const db = await dbOpen();
    const result = await new Promise((resolve,reject) => {
      const request = db.transaction("assets","readonly").objectStore("assets").getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result.sort((a,b) => new Date(b.addedAt) - new Date(a.addedAt));
  } catch { return []; }
}
async function renderAssets() {
  const assets = await getAssets();
  $("#assetCount").textContent = assets.length;
  $("#libraryCount").textContent = `${assets.length} asset${assets.length === 1 ? "" : "s"}`;
  const grid = $("#assetGrid");
  if (!assets.length) {
    grid.innerHTML = '<div class="empty-card"><span class="empty-icon">▧</span><b>Your library is empty</b><p>Add images, video clips or audio files to start organising your media.</p><label class="secondary-button">Add your first files<input type="file" accept="image/*,video/*,audio/*" multiple hidden id="emptyMediaInput"></label></div>';
    return;
  }
  grid.innerHTML = assets.map(asset => {
    const url = URL.createObjectURL(asset.blob);
    let preview = asset.type.startsWith("image/") ? `<img src="${url}" alt="">` : asset.type.startsWith("video/") ? `<video src="${url}" muted playsinline></video>` : '<span>♫</span>';
    return `<article class="asset-card"><div class="asset-preview">${preview}</div><div class="asset-info"><b title="${escapeHTML(asset.name)}">${escapeHTML(asset.name)}</b><small>${(asset.size / (1024 * 1024)).toFixed(2)} MB · ${escapeHTML(asset.type.split("/")[0])}</small></div></article>`;
  }).join("");
}
async function handleFiles(event) {
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  let saved = 0;
  for (const file of files) {
    try { await saveAsset(file); saved++; } catch { showToast("Storage limit reached or file could not be saved"); break; }
  }
  await renderAssets();
  event.target.value = "";
  if (saved) showToast(`${saved} file${saved === 1 ? "" : "s"} added to library`);
}
$("#mediaInput").addEventListener("change", handleFiles);
document.addEventListener("change", event => {
  if (event.target.id === "emptyMediaInput") handleFiles(event);
});
function renderChannels() {
  const channels = [
    ["Instagram","◎","Professional accounts generally require Meta app setup and permissions."],
    ["YouTube","▶","Upload access requires Google OAuth and a configured project."],
    ["TikTok","♪","Posting requires an approved app and applicable scopes."],
    ["Facebook","f","Page publishing requires Meta permissions and review."],
    ["LinkedIn","in","Publishing requires approved LinkedIn API access."],
    ["X","𝕏","API access and rate limits depend on the selected developer tier."]
  ];
  $("#channelGrid").innerHTML = channels.map(([name,logo,detail]) => `<article class="channel-card"><div class="channel-top"><span class="channel-logo">${logo}</span><span class="not-connected">Not connected</span></div><h3>${name}</h3><p>${detail}</p></article>`).join("");
}
$("#backupButton").addEventListener("click", () => {
  const data = { version:1, exportedAt:new Date().toISOString(), drafts:state.drafts, planned:state.planned };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "nrd-workspace-backup.json"; link.click();
  URL.revokeObjectURL(url);
  showToast("Workspace backup downloaded");
});
$("#clearButton").addEventListener("click", () => {
  if (!confirm("Delete all saved drafts and planner reminders from this device? Media files will remain in the library.")) return;
  state = { drafts:[], planned:[] };
  persist();
  resetEditor();
  showToast("Local drafts cleared");
});
$("#helpButton").addEventListener("click", () => showToast("Start with Content studio, then save and organise your drafts."));
renderChannels();
renderAll();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}