document.documentElement.dataset.libraryExtension='cloud-v1';
window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin||event.data?.type!=='library-connect'||!/^[a-f0-9]{64}$/.test(event.data.token||''))return;
 chrome.runtime.sendMessage({type:'connect-cloud',token:event.data.token},result=>{
  const error=chrome.runtime.lastError;
  window.postMessage({type:'library-connected',ok:!error&&result?.ok,queued:result?.queued||0},location.origin);
 });
});
