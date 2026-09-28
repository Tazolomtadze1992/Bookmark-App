/* Capture only after the owner clicks the toolbar action or uses its shortcut.
   No persistent content script, background browsing, cookies, or X credentials. */
importScripts("config.local.js");
let task = Promise.resolve();
chrome.storage.local.setAccessLevel({accessLevel: "TRUSTED_CONTEXTS"}).catch(() => {});

function enqueue(work) {
  task = task.then(work).catch(async error => {
    await chrome.action.setBadgeText({text: "!"});
    await chrome.action.setTitle({title: `Not saved: ${error.message}`});
    console.error("Capture failed:", error.message);
  });
  return task;
}

async function api(path, body) {
  if (!CAPTURE_CONFIG.token) throw new Error("This extension copy is not paired. Load the extension folder from the running server's project, then reload it in Chrome.");
  const response = await fetch(CAPTURE_CONFIG.base + path, {
    method: "POST", headers: {"Content-Type": "application/json", "X-Capture-Token": CAPTURE_CONFIG.token},
    body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Local service error ${response.status}`);
  return result;
}

async function flushQueue() {
  const state = await chrome.storage.local.get("outbox");
  const outbox = state.outbox || {};
  let delivered = 0;
  let error = null;
  for (const [key, item] of Object.entries(outbox)) {
    try { await api("/api/captures", item); }
    catch (failure) { error = String(failure.message || failure).slice(0, 300); break; }
    delete outbox[key];
    await chrome.storage.local.set({outbox});
    delivered++;
  }
  return {delivered, remaining: Object.keys(outbox).length, error};
}

// Serialized into the current page by Chrome. Do not reference outer variables.
function readVisiblePage() {
  const pageURL = new URL(location.href);
  const isX = /^(?:www\.|mobile\.)?(?:x|twitter)\.com$/.test(pageURL.hostname);
  const match = pageURL.pathname.match(/\/(?:[^/]+\/status|i\/status)\/(\d+)/);
  const meta = name => document.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.content || "";
  const result = {
    url: location.href, title: document.title, description: meta("description") || meta("og:description"),
    canonical_url: document.querySelector('link[rel="canonical"]')?.href || "",
    author: "", crop: null, warnings: [], viewport: {width: innerWidth, height: innerHeight},
    media_observed: {}, fixture: document.documentElement.dataset.captureFixture === "true",
  };
  const visibleRect = el => {
    const r = el.getBoundingClientRect();
    const left = Math.max(0, r.left), top = Math.max(0, r.top);
    const width = Math.min(innerWidth, r.right) - left, height = Math.min(innerHeight, r.bottom) - top;
    return width > 40 && height > 40 ? {x: left, y: top, width, height} : null;
  };
  if (isX) {
    if (!match) { result.warnings.push("Open the individual post, not the X timeline."); result.skip_preview = true; return result; }
    const postId = match[1];
    const articles = [...document.querySelectorAll('article[data-testid="tweet"],article')];
    const article = articles.find(el => [...el.querySelectorAll('a[href*="/status/"]')].some(a => {
      // Prefer the timestamp permalink, excluding links in quoted posts/replies.
      const p = new URL(a.href, location.href).pathname.match(/\/status\/(\d+)/);
      return p?.[1] === postId && !!a.querySelector("time");
    }));
    if (!article) {
      result.description = "";
      result.warnings.push("The requested post was not identified in the visible page. URL retained; no login/error-page screenshot counted as a preview.");
      result.skip_preview = true;
      return result;
    }
    result.description = article.querySelector('[data-testid="tweetText"]')?.innerText || "";
    result.author = article.querySelector('[data-testid="User-Name"]')?.innerText.replace(/\s+/g, " ").slice(0, 250) || "";
    result.title = result.description.slice(0, 160) || `X post ${postId}`;
    const video = article.querySelector("video");
    result.media_observed = {video_element_seen: !!video, image_elements_seen: article.querySelectorAll('[data-testid="tweetPhoto"] img').length};
    const media = [...article.querySelectorAll('[data-testid="videoPlayer"], [data-testid="tweetPhoto"], video')]
      .map(visibleRect).filter(Boolean).sort((a,b) => b.width*b.height-a.width*a.height)[0];
    result.crop = media || visibleRect(article);
    if (!result.crop) { result.skip_preview = true; result.warnings.push("The target post is outside the viewport. Source saved, preview missing."); }
    else if (media) result.warnings.push("Preview is the visible media area only; motion playback is not yet verified.");
  }
  return result;
}

async function preparePreview(dataURL, metadata) {
  const blob = await (await fetch(dataURL)).blob();
  const bitmap = await createImageBitmap(blob);
  const scaleX = bitmap.width / metadata.viewport.width;
  const scaleY = bitmap.height / metadata.viewport.height;
  const c = metadata.crop;
  const sx = c ? Math.round(c.x * scaleX) : 0;
  const sy = c ? Math.round(c.y * scaleY) : 0;
  const sw = c ? Math.min(bitmap.width-sx, Math.round(c.width*scaleX)) : bitmap.width;
  const sh = c ? Math.min(bitmap.height-sy, Math.round(c.height*scaleY)) : bitmap.height;
  if (sw < 1 || sh < 1) throw new Error("The selected preview area is not visible.");
  const ratio = Math.min(1, 1440/sw, 1000/sh);
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(sw*ratio)), Math.max(1, Math.round(sh*ratio)));
  canvas.getContext("2d").drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const output = await canvas.convertToBlob({type: "image/jpeg", quality: 0.78});
  const bytes = new Uint8Array(await output.arrayBuffer());
  let binary = "";
  for (let i=0; i<bytes.length; i+=8192) binary += String.fromCharCode(...bytes.subarray(i, i+8192));
  return "data:image/jpeg;base64," + btoa(binary);
}

async function saveTab(tab) {
  const start = performance.now();
  if (!tab?.id || !/^https?:\/\//.test(tab.url || "")) throw new Error("Open an ordinary website or an individual X post first.");
  if (tab.url.startsWith(CAPTURE_CONFIG.base)) { await flushQueue(); await chrome.tabs.create({url: CAPTURE_CONFIG.base}); return; }
  const source = new URL(tab.url);
  if (/^(?:www\.|mobile\.)?(?:x|twitter)\.com$/.test(source.hostname) && !/\/(?:[^/]+\/status|i\/status)\/\d+/.test(source.pathname)) {
    throw new Error("Open the individual X post before saving. Feed capture is not in this test.");
  }
  await chrome.action.setBadgeText({text: "…"});
  await chrome.action.setTitle({title: "Saving this reference…"});
  const queueKey = crypto.randomUUID();
  const outbox = (await chrome.storage.local.get("outbox")).outbox || {};
  let item = {url: tab.url, title: tab.title || tab.url, warnings: [], preview_data_url: null};
  // Persist source before attempting enrichment; a failed preview must not lose the URL.
  outbox[queueKey] = item;
  await chrome.storage.local.set({outbox});
  try {
    const results = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: readVisiblePage});
    const metadata = results[0]?.result;
    if (!metadata) throw new Error("Could not read the page.");
    if (metadata.url !== tab.url) throw new Error("The page changed during capture. Retry on the intended reference.");
    item = {...item, ...metadata};
    // captureVisibleTab targets the ACTIVE tab, not a supplied tab ID. Never capture another tab after a switch.
    const [active] = await chrome.tabs.query({active: true, windowId: tab.windowId});
    if (active?.id !== tab.id) throw new Error("The active tab changed; preview skipped to avoid capturing another page.");
    if (!metadata.skip_preview) {
      const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {format: "jpeg", quality: 85});
      const [after] = await chrome.tabs.query({active: true, windowId: tab.windowId});
      if (after?.id !== tab.id || after.url !== tab.url) throw new Error("The tab changed during the screenshot; preview discarded.");
      item.preview_data_url = await preparePreview(screenshot, metadata);
      item.preview_method = metadata.crop ? "visible_post_media_crop" : "visible_tab_screenshot";
    }
  } catch (error) { item.warnings.push(error.message); }
  item.capture_ms = Math.round(performance.now()-start);
  delete item.crop; delete item.viewport; delete item.skip_preview;
  outbox[queueKey] = item;
  try { await chrome.storage.local.set({outbox}); }
  catch {
    item.preview_data_url = null;
    item.warnings.push("Local queue is full; URL retained without its preview. Start the lab and retry.");
    outbox[queueKey] = item;
    await chrome.storage.local.set({outbox});
  }
  const result = await flushQueue();
  await chrome.action.setBadgeText({text: result.remaining ? "Q" : item.preview_data_url ? "✓" : "!"});
  await chrome.action.setTitle({title: result.remaining ? `Saved in local retry queue. Delivery failed: ${result.error || "Unknown local service error"} Right-click this icon → Retry pending saves after resolving it.` : item.preview_data_url ? "Saved with a preview. Playback and usefulness still need checking." : "Source saved, but preview is incomplete. Open the capture lab for details."});
}

chrome.action.onClicked.addListener(tab => enqueue(() => saveTab(tab)));
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({id: "open-lab", title: "Open capture lab", contexts: ["action"]});
    chrome.contextMenus.create({id: "retry", title: "Retry pending saves", contexts: ["action"]});
  });
});
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === "open-lab") chrome.tabs.create({url: CAPTURE_CONFIG.base});
  if (info.menuItemId === "retry") enqueue(async () => {
    const {remaining, error} = await flushQueue();
    await chrome.action.setBadgeText({text: remaining ? "Q" : "✓"});
    await chrome.action.setTitle({title: remaining ? `Still queued. Delivery failed: ${error || "Unknown local service error"}` : "Pending saves delivered."});
  });
});
