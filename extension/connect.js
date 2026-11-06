document.documentElement.dataset.libraryExtension='cloud-v1';
document.documentElement.dataset.libraryFolderExtension='v1';
window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin||event.data?.type!=='library-connect'||!/^[a-f0-9]{64}$/.test(event.data.token||''))return;
 chrome.runtime.sendMessage({type:'connect-cloud',token:event.data.token},result=>{
  const error=chrome.runtime.lastError;
  window.postMessage({type:'library-connected',ok:!error&&result?.ok,queued:result?.queued||0},location.origin);
 });
});
window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin)return;
 if(event.data?.type==='library-folders-connect'&&/^[a-f0-9]{64}$/.test(event.data.token||''))chrome.runtime.sendMessage({type:'connect-folders',token:event.data.token,account:event.data.account},result=>window.postMessage({type:'library-folders-connected',ok:!chrome.runtime.lastError&&result?.ok},location.origin));
 if(event.data?.type==='library-folders-disconnect')chrome.runtime.sendMessage({type:'disconnect-folders'}).catch(()=>{});
});
chrome.runtime.onMessage.addListener(message=>{if(message.type==='folders-updated')window.dispatchEvent(new Event('library-refresh'));});
