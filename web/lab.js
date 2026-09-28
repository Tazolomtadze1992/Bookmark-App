const token = document.querySelector('meta[name="local-token"]').content;
const $ = s => document.querySelector(s);
let state = null;
const blobURLs = [];
const motionCleanups = [];
async function api(path, method="GET", data) {
  const response = await fetch(path, {method, headers: {"X-Capture-Token": token, ...(data ? {"Content-Type":"application/json"} : {})}, body: data ? JSON.stringify(data) : undefined});
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || `HTTP ${response.status}`); }
  return response;
}
function node(tag, text, cls) { const n=document.createElement(tag); if(text)n.textContent=text; if(cls)n.className=cls; return n; }
function link(text, url) { const a=node("a",text); a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; return a; }
function postId(url) { return new URL(url).pathname.match(/\/(?:[^/]+\/status|i\/status)\/(\d+)/)?.[1]; }
function sameSource(a,b) { if(postId(a)&&postId(b))return postId(a)===postId(b); return a===b; }
function button(label, action) { const b=node("button",label); b.addEventListener("click",()=>Promise.resolve(action()).catch(showError)); return b; }
function showError(e) { $("#status").textContent=e.message; }
function reviewSelect(label, choices, value, onChange) {
  const row=node("label",label), select=node("select");
  for(const [v,t] of choices){const o=node("option",t);o.value=v;select.append(o);}
  select.value=value;select.addEventListener("change",()=>onChange(select.value).catch(showError));row.append(select);return row;
}
function motionPreview(item, media) {
  const wrap=node("div",null,"motion-preview"), video=node("video",null,"motion-video");
  video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
  video.preload="none";video.width=media.width;video.height=media.height;
  video.setAttribute("aria-label",`Motion preview: ${item.title}`);
  const controls=node("div",null,"motion-controls"), note=node("p","","motion-note");note.setAttribute("role","status");
  let visible=false,manualPause=false,manualPlay=false,disposed=false,blocked=false;
  if(!item.has_preview && state.x_images?.[item.post_id])video.poster=state.x_images[item.post_id];
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  function update(){toggle.textContent=video.paused?"Play":"Pause";}
  async function sync(){
    if(disposed)return;
    if(!visible || document.hidden || manualPause || (reduced.matches&&!manualPlay)){video.pause();return;}
    if(blocked)return;
    if(!video.src)video.src=media.url;
    try{await video.play();if(!disposed)note.textContent="";}catch(error){
      // Scrolling away may intentionally interrupt a pending play request.
      if(disposed || error.name==="AbortError")return;
      blocked=true;
      note.textContent=error.name==="NotAllowedError" ? "Autoplay unavailable. Use the small Play control." : "Video unavailable. The saved source and screenshot remain available.";
    }
    update();
  }
  const toggle=button("Play",()=>{if(video.paused){manualPause=false;manualPlay=true;blocked=false;return sync();}manualPause=true;video.pause();});
  toggle.setAttribute("aria-label",`Play or pause ${item.title}`);
  const sound=button("Unmute",()=>{video.muted=!video.muted;sound.textContent=video.muted?"Unmute":"Mute";});
  controls.append(toggle,sound);wrap.append(video,controls,note);
  video.addEventListener("play",update);video.addEventListener("pause",update);
  video.addEventListener("error",()=>{blocked=true;note.textContent="Video unavailable. The saved source and screenshot remain available.";});
  if(item.has_preview)api(`/api/image/${item.id}`).then(r=>r.blob()).then(b=>{if(disposed)return;const u=URL.createObjectURL(b);blobURLs.push(u);video.poster=u;}).catch(showError);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0.1});observer.observe(wrap);
  const preference=()=>{manualPlay=false;if(reduced.matches)note.textContent="Reduced motion: preview paused.";else if(note.textContent==="Reduced motion: preview paused.")note.textContent="";sync();};
  reduced.addEventListener("change",preference);document.addEventListener("visibilitychange",sync);
  if(reduced.matches)note.textContent="Reduced motion: preview paused.";
  motionCleanups.push(()=>{disposed=true;observer.disconnect();video.pause();video.removeAttribute("src");video.load();reduced.removeEventListener("change",preference);document.removeEventListener("visibilitychange",sync);});
  return wrap;
}
$("#motion-form").addEventListener("submit",async event=>{
  event.preventDefault();const input=$("#bearer"), submit=$("#run-probe");
  let bearer=input.value.trim();input.value="";submit.disabled=true;
  $("#motion-status").textContent="Running one five-post lookup…";
  try{const result=await(await api("/api/x-probe","POST",{bearer_token:bearer,confirm_five_posts:true})).json();bearer="";await refresh();if(result.error)$("#motion-status").textContent=result.error;}
  catch(error){bearer="";$("#motion-status").textContent=error.message;submit.disabled=false;}
});
async function refresh() {
  state=await (await api("/api/state")).json();
  for(const cleanup of motionCleanups.splice(0))cleanup();
  for(const url of blobURLs)URL.revokeObjectURL(url);blobURLs.length=0;
  const sources=$("#sources");sources.replaceChildren();
  for(const source of state.sources){
    const saved=state.captures.find(c=>sameSource(c.url,source.url));
    const row=node("div",null,"source");
    row.append(link(`${source.id} · ${source.kind==="x_post" ? "@"+source.handle_from_url : new URL(source.url).hostname}`,source.url),node("small",saved ? (saved.has_preview ? "Preview captured · review" : "Source only") : "Not captured"));sources.append(row);
  }
  const actual=state.captures.filter(c=>!c.fixture);
  $("#progress").textContent=`${state.sources.filter(s=>actual.some(c=>sameSource(c.url,s.url))).length} / ${state.sources.length} sources saved`;
  const wrap=$("#captures");wrap.replaceChildren();
  if(!state.captures.length)wrap.append(node("div","No captures yet. Open a test source, then click the pinned extension. No uploads or metadata fields.","empty"));
  for(const item of state.captures){
    const card=node("article",null,"card");card.dataset.id=item.id;
    const motion=state.motion?.[item.post_id];
    if(motion){
      card.append(motionPreview(item,motion));
    }else if(state.x_images?.[item.post_id]){
      const image=node("img",null,"preview");image.alt=`X media preview of ${item.title}`;image.src=state.x_images[item.post_id];image.loading="lazy";card.append(image);
    }else if(item.has_preview){
      const image=node("img",null,"preview");image.alt=`Automatically captured preview of ${item.title}`;
      card.append(image);
      api(`/api/image/${item.id}`).then(r=>r.blob()).then(b=>{const u=URL.createObjectURL(b);blobURLs.push(u);image.src=u;}).catch(showError);
    }else card.append(node("div","Source saved. No usable screenshot was captured.","missing"));
    const body=node("div",null,"body");body.append(node("div",`${item.fixture?"CONTROLLED FIXTURE · ":""}${item.kind==="x_post"?"X POST":"WEBSITE"} · ${motion?"API VIDEO PREVIEW":item.has_preview?"PREVIEW NEEDS REVIEW":"PARTIAL CAPTURE"}`,"meta"));
    body.append(node("h3",item.title));
    body.append(node("p",item.capture_origin==="x_bookmark" ? "Saved from a new X bookmark" : `${new URL(item.url).hostname} · ${item.capture_ms??"?"} ms · ${Math.round(item.preview_bytes/1024)} KB · ${item.capture_attempts} save attempt(s)`));
    if(item.author_observed)body.append(node("p",`Observed author: ${item.author_observed}`));
    if(item.warnings.length)body.append(node("p",item.warnings.map(w=>motion?w.replace("Preview is the visible media area only; motion playback is not yet verified.","Native video from the official X API; saved screenshot retained as its poster."):w).join(" "),"warn"));
    const actions=node("div",null,"actions");const source=link("Open original",item.url);
    source.addEventListener("click",()=>api("/api/evaluation","POST",{id:item.id,source_opened:true}).catch(showError));actions.append(source);
    if(item.post_id){
      const show=button("Test X embed",()=>{
        show.disabled=true;
        const note=node("p","Loading X on demand. A rendered post is not proof its video plays; assess playback below.");
        const frame=node("iframe",null,"embed");frame.title="Official X post embed";
        frame.sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";
        frame.src=`http://localhost:${location.port}/embed/${item.post_id}`;
        frame.setAttribute("allow","fullscreen");body.append(note,frame);
      });actions.append(show);
    }
    body.append(actions);
    const review=node("div",null,"review");
    review.append(reviewSelect("Recognisable preview?",[["unknown","Not assessed"],["yes","Yes"],["no","No"]],item.recognisable===null?"unknown":item.recognisable?"yes":"no", async v=>{await api("/api/evaluation","POST",{id:item.id,recognisable:v==="unknown"?null:v==="yes"});$("#status").textContent="Assessment saved.";}));
    if(item.post_id)review.append(reviewSelect("Motion playback",[["not_tested","Not tested"],["works_in_embed","Works inside embed"],["source_only","Only works at source"],["failed","Does not work"],["not_applicable","No motion in this post"]],item.playback,async v=>{await api("/api/evaluation","POST",{id:item.id,playback:v});$("#status").textContent="Playback assessment saved.";}));
    const del=button("Delete local capture",async()=>{if(confirm("Delete this capture and its preview from this computer?")){await api(`/api/captures/${item.id}`,"DELETE");await refresh();}});del.className="delete";review.append(del);body.append(review);card.append(body);wrap.append(card);
  }
  $("#status").textContent="Captures are local. Paid X requests are not made by saving or refreshing.";
  $("#run-probe").disabled=!!state.x_probe;
  $("#motion-status").textContent=state.x_probe ? (state.x_probe.error || `Lookup finished: ${(state.x_probe.sample_results||[]).filter(p=>p.video_variants_present).length} primary video links returned. ${state.x_probe.playback_verified?"Real native playback verified for the five-post test.":"Playback still needs real verification."} No repeat request will run.`) : "No paid lookup has run. Your existing captures are unchanged.";
  renderBookmarkStatus();
  $("#probe-status").textContent=state.x_probe ? " A separate API probe report exists; billed cost still requires verification." : " No authenticated X probe report yet.";
}
$("#refresh").addEventListener("click",()=>refresh().catch(showError));
$("#export").addEventListener("click",async()=>{try{const report=await(await api("/api/export")).json();const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"}));const a=node("a");a.href=u;a.download="capture-test-results.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){showError(e);}});
// Returning from an embedded player also focuses this window. Keep open
// players intact; the explicit Refresh button remains available for new saves.
window.addEventListener("focus",()=>{if(!document.querySelector("iframe.embed, video.motion-video"))refresh().catch(showError);});
refresh().catch(showError);

function renderBookmarkStatus(){
  const b=state.bookmarks;if(!b||!$("#bookmark-status"))return;
  $("#bookmark-status").textContent=`${b.message} Excluded: ${b.baseline_count}. Added: ${b.imported}. Reserved test allowance: $${b.budget_reserved_usd.toFixed(2)} / $${b.budget_limit_usd.toFixed(2)} (not a bill).`;
  $("#bookmark-baseline").disabled=!b.connected||!!b.ready_at;
  $("#bookmark-check").disabled=b.phase!=="ready";
  $("#bookmark-enable").disabled=b.phase!=="ready"||b.enabled;
  $("#bookmark-pause").disabled=!b.enabled;
}
$("#bookmark-connect")?.addEventListener("submit",async e=>{
  e.preventDefault();try{const r=await(await api("/api/bookmarks/connect","POST",{client_id:$("#x-client-id").value.trim()})).json();location.assign(r.authorize_url);}catch(e){$("#bookmark-status").textContent=e.message;}
});
for(const [id,path,body] of [
 ["bookmark-baseline","baseline",{confirm:true}], ["bookmark-check","check",{confirm:true}],
 ["bookmark-enable","control",{confirm:true,action:"enable"}], ["bookmark-pause","control",{confirm:true,action:"pause"}]
])$("#"+id)?.addEventListener("click",async()=>{
  const b=$("#"+id);b.disabled=true;$("#bookmark-status").textContent="Working…";
  try{await api("/api/bookmarks/"+path,"POST",body);await refresh();}
  catch(e){await refresh();$("#bookmark-status").textContent=e.message;}
});
// Poll local state only. These reads never call X. New cards appear automatically.
setInterval(async()=>{if(document.hidden)return;try{
  const next=await(await api("/api/state")).json();
  const before=JSON.stringify((state?.captures||[]).map(c=>[c.id,c.updated_at]));
  const after=JSON.stringify(next.captures.map(c=>[c.id,c.updated_at]));
  if(before!==after)await refresh();else{state.bookmarks=next.bookmarks;renderBookmarkStatus();}
}catch(e){/* The last visible status remains until the server returns. */}},15000);
