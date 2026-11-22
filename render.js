(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  let lastVideoUrl = "";
  let cancelRequested = false;

  function notify(message) {
    if (window.NRDToast) window.NRDToast(message);
    else {
      const node = $("#toast");
      if (node) { node.textContent = message; node.classList.add("show"); }
    }
  }
  function chooseMimeType() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return "";
    const candidates = ["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }
  function loadImage(blob) {
    return new Promise((resolve,reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => resolve({image,url});
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("An image could not be opened")); };
      image.src = url;
    });
  }
  function drawCover(context,image,width,height,progress,direction,alpha=1) {
    const scale = Math.max(width/image.naturalWidth,height/image.naturalHeight);
    const zoom = 1 + 0.075 * progress;
    const drawWidth = image.naturalWidth * scale * zoom;
    const drawHeight = image.naturalHeight * scale * zoom;
    const driftX = direction * width * 0.025 * progress;
    const driftY = -direction * height * 0.012 * progress;
    context.globalAlpha = alpha;
    context.drawImage(image,(width-drawWidth)/2+driftX,(height-drawHeight)/2+driftY,drawWidth,drawHeight);
    context.globalAlpha = 1;
  }
  function outputDimensions(format,resolution) {
    const longSide = Number(resolution);
    if (format === "16:9") return {width:Math.round(longSide*16/9/2)*2,height:longSide};
    if (format === "1:1") return {width:longSide,height:longSide};
    return {width:longSide,height:Math.round(longSide*16/9/2)*2};
  }
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve,ms));
  }
  function setProgress(value,label) {
    $("#renderProgress").value = value;
    $("#renderProgressValue").textContent = Math.round(value) + "%";
    $("#renderProgressLabel").textContent = label;
  }
  async function renderProject() {
    const button = $("#renderVideoButton");
    const project = window.NRDProjects?.getActiveProject();
    if (!project) { notify("Open a project storyboard first"); return; }
    if (!project.scenes?.length) { notify("Add at least one scene before rendering"); return; }
    const missing = project.scenes.filter(scene => !scene.assetId);
    if (missing.length) {
      notify("Add a reference image to every scene before rendering");
      return;
    }
    const mimeType = chooseMimeType();
    if (!mimeType) {
      notify("This browser does not support local WebM recording. Try current Chrome on Android.");
      return;
    }
    cancelRequested = false;
    button.disabled = true;
    $("#cancelRenderButton").hidden = false;
    $("#renderProgressWrap").hidden = false;
    $("#renderResult").hidden = true;
    setProgress(0,"Preparing scene images…");
    let loaded = [];
    let recorder;
    let stream;
    try {
      for (let index=0; index<project.scenes.length; index++) {
        if (cancelRequested) { const error = new Error("Render cancelled"); error.name = "AbortError"; throw error; }
        const scene = project.scenes[index];
        const asset = await window.NRDProjects.getAsset(scene.assetId);
        if (!asset?.blob) throw new Error("Missing image for scene: " + (scene.title || index+1));
        const loadedImage = await loadImage(asset.blob);
        loaded.push({...loadedImage,scene});
      }
      const resolution = $("#renderResolution").value;
      const fps = Number($("#renderFps").value);
      const dimensions = outputDimensions(project.format,resolution);
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext("2d",{alpha:false});
      if (!context) throw new Error("Canvas rendering is unavailable in this browser");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      stream = canvas.captureStream(fps);
      recorder = new MediaRecorder(stream,{mimeType,videoBitsPerSecond:Number(resolution)===720?4500000:2200000});
      const chunks = [];
      recorder.addEventListener("dataavailable",event => { if (event.data && event.data.size) chunks.push(event.data); });
      const stopped = new Promise((resolve,reject) => {
        recorder.addEventListener("stop",resolve,{once:true});
        recorder.addEventListener("error",event => reject(event.error || new Error("Video recording failed")),{once:true});
      });
      recorder.start(1000);
      const totalFrames = loaded.reduce((sum,item) => sum + Math.max(1,Math.ceil(Number(item.scene.duration)*fps)),0);
      let completedFrames = 0;
      const interval = 1000/fps;
      const transitionSeconds = 0.45;

      for (let sceneIndex=0; sceneIndex<loaded.length; sceneIndex++) {
        const current = loaded[sceneIndex];
        const previous = loaded[sceneIndex-1];
        const duration = Number(current.scene.duration);
        const frames = Math.max(1,Math.ceil(duration*fps));
        const direction = sceneIndex % 2 === 0 ? 1 : -1;
        setProgress(Math.round(completedFrames/totalFrames*100),"Rendering scene " + (sceneIndex+1) + " of " + loaded.length);
        for (let frame=0; frame<frames; frame++) {
          if (cancelRequested) { const error = new Error("Render cancelled"); error.name = "AbortError"; throw error; }
          const progress = frames > 1 ? frame/(frames-1) : 1;
          const localTime = frame/fps;
          context.fillStyle = "#000";
          context.fillRect(0,0,canvas.width,canvas.height);
          if (previous && localTime < transitionSeconds) {
            drawCover(context,previous.image,canvas.width,canvas.height,1,direction*-1,1);
            drawCover(context,current.image,canvas.width,canvas.height,progress,direction,Math.min(1,localTime/transitionSeconds));
          } else {
            drawCover(context,current.image,canvas.width,canvas.height,progress,direction,1);
          }
          completedFrames++;
          if (frame % Math.max(1,Math.floor(fps/3)) === 0) {
            setProgress(completedFrames/totalFrames*100,"Rendering scene " + (sceneIndex+1) + " of " + loaded.length);
          }
          await sleep(interval);
        }
      }
      if (cancelRequested) { const error = new Error("Render cancelled"); error.name = "AbortError"; throw error; }
      setProgress(100,"Finalising video…");
      recorder.stop();
      await stopped;
      const blob = new Blob(chunks,{type:mimeType});
      if (!blob.size) throw new Error("The browser returned an empty video file");
      if (lastVideoUrl) URL.revokeObjectURL(lastVideoUrl);
      lastVideoUrl = URL.createObjectURL(blob);
      const safeName = (project.name || "nrd-project").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"") || "nrd-project";
      const result = $("#renderResult");
      result.innerHTML = '<video controls playsinline preload="metadata" src="' + lastVideoUrl + '"></video><div class="render-download-row"><div><b>Video ready</b><small>' + (blob.size/1048576).toFixed(1) + ' MB · ' + mimeType + '</small></div><a class="primary-button" href="' + lastVideoUrl + '" download="' + safeName + '.webm">Download WebM ↓</a></div>';
      result.hidden = false;
      notify("Your silent video is ready");
    } catch (error) {
      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch {}
      }
      setProgress(0,error.name === "AbortError" ? "Render cancelled" : "Render did not complete");
      notify(error.name === "AbortError" ? "Render cancelled" : (error.message || "Could not render this project"));
    } finally {
      stream?.getTracks().forEach(track => track.stop());
      loaded.forEach(item => URL.revokeObjectURL(item.url));
      button.disabled = false;
      $("#cancelRenderButton").hidden = true;
    }
  }
  $("#renderVideoButton")?.addEventListener("click",renderProject);
  $("#cancelRenderButton")?.addEventListener("click",() => {
    if (!$("#renderVideoButton")?.disabled) return;
    cancelRequested = true;
    notify("Stopping render…");
  });
  window.NRDRenderer = { renderProject, chooseMimeType, outputDimensions };
})();