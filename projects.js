(() => {
  "use strict";
  const KEY = "nrd-projects-v1";
  const DB_NAME = "nrd-studio-media";
  const DB_VERSION = 1;
  const $ = selector => document.querySelector(selector);
  let projects = loadProjects();
  let activeProjectId = localStorage.getItem("nrd-active-project") || "";
  let objectUrls = [];

  function loadProjects() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }
  function saveProjects() {
    localStorage.setItem(KEY, JSON.stringify(projects));
    renderProjects();
  }
  function toast(message) {
    if (window.NRDToast) window.NRDToast(message);
    else {
      const node = $("#toast");
      if (node) { node.textContent = message; node.classList.add("show"); }
    }
  }
  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
  }
  function go(page) {
    document.querySelectorAll(".page").forEach(node => node.classList.toggle("active", node.id === "page-" + page));
    document.querySelectorAll("[data-page]").forEach(node => node.classList.toggle("active", node.dataset.page === page));
    const labels = {home:"Overview",studio:"Content studio",projects:"Projects",storyboard:"Storyboard",library:"Media library",calendar:"Planner",channels:"Channels",settings:"Settings"};
    if ($("#pageCrumb")) $("#pageCrumb").textContent = labels[page] || page;
    history.replaceState(null, "", "#" + page);
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function currentProject() {
    return projects.find(project => project.id === activeProjectId) || null;
  }
  function createProject(event) {
    event.preventDefault();
    const name = $("#projectName").value.trim();
    if (!name) { toast("Add a project name first"); $("#projectName").focus(); return; }
    const project = {
      id:crypto.randomUUID(),
      name,
      format:$("#projectFormat").value,
      type:$("#projectType").value,
      brief:$("#projectBrief").value.trim(),
      scenes:[],
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    projects.unshift(project);
    saveProjects();
    $("#projectName").value = "";
    $("#projectBrief").value = "";
    activeProjectId = project.id;
    openStoryboard(project.id);
    toast("Project created on this device");
  }
  function renderProjects() {
    const grid = $("#projectGrid");
    if (!grid) return;
    $("#projectCount").textContent = projects.length + (projects.length === 1 ? " project" : " projects");
    if (!projects.length) {
      grid.innerHTML = '<div class="empty-card"><span class="empty-icon">▤</span><b>No projects yet</b><p>Create a project to start organising scenes and media.</p></div>';
      return;
    }
    grid.innerHTML = projects.map(project => `
      <article class="project-card">
        <div class="project-card-top"><span class="project-format">${escapeHTML(project.format)}</span><span class="project-more">${escapeHTML(project.type)}</span></div>
        <h3>${escapeHTML(project.name)}</h3>
        <p>${escapeHTML(project.brief || "No creative brief yet.")}</p>
        <div class="project-card-meta"><span>${(project.scenes || []).length} scenes</span><span>Updated ${new Date(project.updatedAt).toLocaleDateString()}</span></div>
        <div class="project-card-actions"><button class="primary-button" data-open-project="${escapeHTML(project.id)}">Open storyboard →</button><button class="small-action" data-delete-project="${escapeHTML(project.id)}">Delete</button></div>
      </article>`).join("");
  }
  async function openAssets() {
    return new Promise((resolve,reject) => {
      if (!("indexedDB" in window)) return resolve([]);
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("assets")) request.result.createObjectStore("assets",{keyPath:"id"});
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const get = db.transaction("assets","readonly").objectStore("assets").getAll();
        get.onsuccess = () => { const rows=get.result||[]; db.close(); resolve(rows.filter(row => row.type?.startsWith("image/"))); };
        get.onerror = () => { db.close(); reject(get.error); };
      };
    }).catch(() => []);
  }
  async function renderAssetOptions(selected = "") {
    const select = $("#sceneAsset");
    if (!select) return;
    const assets = await openAssets();
    select.innerHTML = '<option value="">No asset selected</option>' + assets.map(asset =>
      '<option value="' + escapeHTML(asset.id) + '">' + escapeHTML(asset.name) + '</option>'
    ).join("");
    select.value = selected;
  }
  async function openStoryboard(id) {
    const project = projects.find(item => item.id === id);
    if (!project) return;
    activeProjectId = id;
    localStorage.setItem("nrd-active-project", id);
    $("#storyboardTitle").textContent = project.name;
    $("#storyboardBrief").textContent = project.brief || project.type + " · Arrange visual references and shot notes.";
    $("#storyboardFormat").textContent = project.format;
    await renderAssetOptions();
    resetSceneForm();
    await renderScenes();
    go("storyboard");
  }
  function resetSceneForm() {
    $("#editingSceneId").value = "";
    $("#sceneTitle").value = "";
    $("#sceneDescription").value = "";
    $("#sceneDuration").value = "3";
    $("#sceneAsset").value = "";
    $("#addSceneButton").textContent = "Add scene to storyboard";
  }
  async function renderScenes() {
    const project = currentProject();
    if (!project) return;
    const scenes = project.scenes || [];
    const list = $("#sceneList");
    const total = scenes.reduce((sum,scene) => sum + Number(scene.duration || 0),0);
    $("#sceneCount").textContent = scenes.length + (scenes.length === 1 ? " scene" : " scenes") + " · " + total.toFixed(1) + " sec total";
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls = [];
    if (!scenes.length) {
      list.innerHTML = '<div class="empty-card"><span class="empty-icon">▧</span><b>Your storyboard is empty</b><p>Add the first scene to begin planning the video.</p></div>';
      return;
    }
    const assets = await openAssets();
    const assetMap = new Map(assets.map(asset => [asset.id,asset]));
    list.innerHTML = scenes.map((scene,index) => {
      const asset = assetMap.get(scene.assetId);
      let thumb = '<div class="scene-thumb-placeholder">0' + (index+1) + '</div>';
      if (asset?.blob) {
        const url = URL.createObjectURL(asset.blob);
        objectUrls.push(url);
        thumb = '<img class="scene-thumb" src="' + url + '" alt="Scene reference">';
      }
      return `
        <article class="scene-card" data-scene-id="${escapeHTML(scene.id)}">
          <div class="scene-visual">${thumb}</div>
          <div class="scene-details"><div class="scene-card-head"><span class="scene-number">SCENE ${String(index+1).padStart(2,"0")}</span><span class="scene-duration">${Number(scene.duration).toFixed(1)} sec</span></div><h3>${escapeHTML(scene.title)}</h3><p>${escapeHTML(scene.description || "No shot notes yet.")}</p><small class="scene-asset-label">${asset ? "Reference: " + escapeHTML(asset.name) : "No reference image"}</small></div>
          <div class="scene-actions"><button class="small-action" data-edit-scene="${escapeHTML(scene.id)}">Edit</button><button class="small-action" data-move-scene="-1" data-scene="${escapeHTML(scene.id)}" ${index===0?"disabled":""}>↑</button><button class="small-action" data-move-scene="1" data-scene="${escapeHTML(scene.id)}" ${index===scenes.length-1?"disabled":""}>↓</button><button class="small-action scene-remove" data-remove-scene="${escapeHTML(scene.id)}">Remove</button></div>
        </article>`;
    }).join("");
  }
  function saveScene(event) {
    event.preventDefault();
    const project = currentProject();
    if (!project) { toast("Open a project first"); return; }
    const title = $("#sceneTitle").value.trim();
    if (!title) { toast("Add a scene title"); $("#sceneTitle").focus(); return; }
    const duration = Number($("#sceneDuration").value);
    if (!Number.isFinite(duration) || duration < 1 || duration > 120) { toast("Scene duration must be between 1 and 120 seconds"); return; }
    const scene = {
      id:$("#editingSceneId").value || crypto.randomUUID(),
      title,
      description:$("#sceneDescription").value.trim(),
      duration,
      assetId:$("#sceneAsset").value || "",
      updatedAt:new Date().toISOString()
    };
    const index = project.scenes.findIndex(item => item.id === scene.id);
    if (index >= 0) project.scenes[index] = scene;
    else project.scenes.push(scene);
    project.updatedAt = new Date().toISOString();
    saveProjects();
    resetSceneForm();
    renderScenes();
    toast(index >= 0 ? "Scene updated" : "Scene added");
  }
  function editScene(id) {
    const project = currentProject();
    const scene = project?.scenes.find(item => item.id === id);
    if (!scene) return;
    $("#editingSceneId").value = scene.id;
    $("#sceneTitle").value = scene.title;
    $("#sceneDescription").value = scene.description;
    $("#sceneDuration").value = scene.duration;
    renderAssetOptions(scene.assetId);
    $("#addSceneButton").textContent = "Save scene changes";
    $("#sceneTitle").focus();
  }
  function moveScene(id, direction) {
    const project = currentProject();
    if (!project) return;
    const index = project.scenes.findIndex(item => item.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= project.scenes.length) return;
    [project.scenes[index],project.scenes[next]] = [project.scenes[next],project.scenes[index]];
    project.updatedAt = new Date().toISOString();
    saveProjects();
    renderScenes();
  }
  function deleteProject(id) {
    const project = projects.find(item => item.id === id);
    if (!project || !confirm('Delete "' + project.name + '" and its storyboard? Media files in your library will remain.')) return;
    projects = projects.filter(item => item.id !== id);
    if (activeProjectId === id) { activeProjectId = ""; localStorage.removeItem("nrd-active-project"); }
    saveProjects();
    toast("Project deleted");
  }

  $("#createProjectButton")?.addEventListener("click",createProject);
  $("#projectGrid")?.addEventListener("click", event => {
    const open = event.target.closest("[data-open-project]");
    const remove = event.target.closest("[data-delete-project]");
    if (open) openStoryboard(open.dataset.openProject);
    if (remove) deleteProject(remove.dataset.deleteProject);
  });
  $("#addSceneButton")?.addEventListener("click",saveScene);
  $("#sceneList")?.addEventListener("click",event => {
    const card = event.target.closest("[data-scene-id]");
    if (!card) return;
    if (event.target.closest("[data-edit-scene]")) editScene(card.dataset.sceneId);
    if (event.target.closest("[data-remove-scene]")) {
      const project=currentProject();
      project.scenes=project.scenes.filter(scene=>scene.id!==card.dataset.sceneId);
      project.updatedAt=new Date().toISOString();
      saveProjects(); renderScenes(); toast("Scene removed");
    }
    const mover=event.target.closest("[data-move-scene]");
    if (mover) moveScene(mover.dataset.scene,Number(mover.dataset.moveScene));
  });
  $("#sceneList")?.addEventListener("change",event => {
    if (event.target.id === "sceneAsset") return;
  });
  document.querySelectorAll('[data-page="projects"]').forEach(button => button.addEventListener("click",renderProjects));
  renderProjects();
  if (location.hash === "#storyboard" && activeProjectId) openStoryboard(activeProjectId);
  window.NRDProjects = {
    list:() => projects.map(project => structuredClone(project)),
    exportData:() => projects.map(project => structuredClone(project)),
    getActiveProject:() => { const project=currentProject(); return project ? structuredClone(project) : null; },
    getAsset:async id => { const assets=await openAssets(); return assets.find(asset => asset.id===id) || null; }
  };
})();