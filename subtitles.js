(() => {
  "use strict";
  let cues = [];
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));

  function formatTime(ms, separator = ",") {
    const value = Math.max(0, Math.round(Number(ms) || 0));
    const hours = Math.floor(value / 3600000);
    const minutes = Math.floor((value % 3600000) / 60000);
    const seconds = Math.floor((value % 60000) / 1000);
    const millis = value % 1000;
    return String(hours).padStart(2,"0") + ":" + String(minutes).padStart(2,"0") + ":" +
      String(seconds).padStart(2,"0") + separator + String(millis).padStart(3,"0");
  }
  function parseTime(value) {
    const match = String(value).trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})$/);
    if (!match) return null;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    const millis = Number(String(match[4]).padEnd(3,"0"));
    if (minutes > 59 || seconds > 59) return null;
    return (((hours * 60 + minutes) * 60) + seconds) * 1000 + millis;
  }
  function normaliseCue(cue, index) {
    const start = Math.max(0, Number(cue.start) || 0);
    const end = Math.max(start + 100, Number(cue.end) || start + 2500);
    return { id:cue.id || crypto.randomUUID(), start, end, text:String(cue.text || "").trim(), order:index };
  }
  function render() {
    const list = $("#subtitleList");
    if (!list) return;
    if (!cues.length) {
      list.innerHTML = '<div class="empty-inline">No subtitle cues yet. Build from script or import an SRT/VTT file.</div>';
      return;
    }
    list.innerHTML = cues.map((cue,index) => `
      <article class="subtitle-cue" data-cue-id="${escapeHTML(cue.id)}">
        <div class="cue-index">${String(index + 1).padStart(2,"0")}</div>
        <div class="cue-fields">
          <div class="cue-times">
            <label>Start<input class="text-input cue-time" data-field="start" value="${formatTime(cue.start)}" aria-label="Subtitle start time"></label>
            <label>End<input class="text-input cue-time" data-field="end" value="${formatTime(cue.end)}" aria-label="Subtitle end time"></label>
          </div>
          <label class="cue-caption-label">Caption<textarea class="text-input cue-caption" data-field="text" rows="2" aria-label="Subtitle text">${escapeHTML(cue.text)}</textarea></label>
        </div>
        <button class="small-action cue-delete" data-delete-cue="${escapeHTML(cue.id)}" aria-label="Delete subtitle cue">Remove</button>
      </article>`).join("");
  }
  function setCues(items) {
    cues = Array.isArray(items) ? items.map(normaliseCue) : [];
    render();
  }
  function getCues() {
    return cues.map(({id,start,end,text}) => ({id,start,end,text}));
  }
  function parseSubtitleFile(source) {
    const content = source.replace(/^\uFEFF/, "").replace(/\r/g, "");
    const blocks = content.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
    const parsed = [];
    for (const block of blocks) {
      if (/^WEBVTT(?:\s|$)/i.test(block)) continue;
      const lines = block.split("\n");
      const timeLineIndex = lines.findIndex(line => line.includes("-->"));
      if (timeLineIndex < 0) continue;
      const pair = lines[timeLineIndex].split("-->");
      const start = parseTime(pair[0].trim());
      const endToken = pair[1].trim().split(/\s+/)[0];
      const end = parseTime(endToken);
      const text = lines.slice(timeLineIndex + 1).join("\n").trim();
      if (start === null || end === null || end <= start || !text) continue;
      parsed.push({id:crypto.randomUUID(),start,end,text});
    }
    return parsed;
  }
  function exportSrt() {
    if (!cues.length) { window.NRDToast?.("Add or build subtitle cues first"); return; }
    const ordered = [...cues].sort((a,b) => a.start - b.start);
    const invalid = ordered.some(cue => !cue.text.trim() || cue.end <= cue.start);
    if (invalid) { window.NRDToast?.("Each cue needs text and an end time after its start"); return; }
    const content = ordered.map((cue,index) =>
      (index + 1) + "\n" + formatTime(cue.start) + " --> " + formatTime(cue.end) + "\n" + cue.text
    ).join("\n\n") + "\n";
    const blob = new Blob([content], {type:"application/x-subrip;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const title = ($("#contentTitle")?.value || "nrd-subtitles").trim().replace(/[^a-z0-9-_]+/gi,"-");
    link.href = url;
    link.download = (title || "nrd-subtitles") + ".srt";
    link.click();
    URL.revokeObjectURL(url);
    window.NRDToast?.("SRT exported. Check the timing against your audio.");
  }
  $("#subtitleList")?.addEventListener("change", event => {
    const field = event.target.dataset.field;
    if (!field) return;
    const card = event.target.closest("[data-cue-id]");
    const cue = cues.find(item => item.id === card?.dataset.cueId);
    if (!cue) return;
    if (field === "text") cue.text = event.target.value;
    else {
      const value = parseTime(event.target.value);
      if (value === null) {
        window.NRDToast?.("Use HH:MM:SS,mmm time format");
        render();
        return;
      }
      cue[field] = value;
      if (cue.end <= cue.start) {
        window.NRDToast?.("End time must be after start time");
        render();
        return;
      }
    }
    render();
  });
  $("#subtitleList")?.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-cue]");
    if (!button) return;
    cues = cues.filter(cue => cue.id !== button.dataset.deleteCue);
    render();
  });
  $("#addSubtitleButton")?.addEventListener("click", () => {
    const start = cues.length ? Math.max(...cues.map(cue => cue.end)) : 0;
    cues.push({id:crypto.randomUUID(),start,end:start + 2500,text:"New caption"});
    render();
    const last = $("#subtitleList .subtitle-cue:last-child .cue-caption");
    last?.focus();
  });
  $("#buildSubtitlesButton")?.addEventListener("click", () => {
    const script = $("#contentIdea")?.value.trim() || "";
    if (!script) { window.NRDToast?.("Add a script before building subtitle cues"); return; }
    const lines = script.split(/(?<=[.!?])\s+|\n+/).map(line => line.trim()).filter(Boolean);
    cues = lines.map((text,index) => ({id:crypto.randomUUID(),start:index * 3500,end:index * 3500 + 3200,text}));
    render();
    window.NRDToast?.("Starter cues created. Adjust the timings to your audio.");
  });
  $("#subtitleFileInput")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseSubtitleFile(await file.text());
      if (!imported.length) throw new Error("No valid subtitle cues found");
      cues = imported;
      render();
      window.NRDToast?.("Imported " + imported.length + " subtitle cues");
    } catch (error) {
      window.NRDToast?.(error.message || "Could not import subtitle file");
    }
    event.target.value = "";
  });
  $("#downloadSubtitlesButton")?.addEventListener("click", exportSrt);
  window.NRDSubtitles = { getCues, setCues, exportSrt, parseSubtitleFile };
})();