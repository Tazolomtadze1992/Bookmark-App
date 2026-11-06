importScripts('folder-scanner.js');
const X_ACCESS={origins:['https://x.com/*']};
let folderRun=null;
async function folderCloud(action,body={}){
 const {folderToken}=await chrome.storage.local.get('folderToken');
 if(!folderToken)throw Error('Connect automatic folders from your library.');
 const r=await fetch(CAPTURE_CONFIG.endpoint+'/folders/browser/'+action,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json','X-Device-Token':folderToken},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const data=await r.json();if(!r.ok){const e=Error(data.error||'Could not update folders. It will retry.');e.status=r.status;throw e;}return data;
}
async function closeFolderTab(tabId){
 if(!tabId)return;
 const {folderScanLock}=await chrome.storage.local.get('folderScanLock');if(folderScanLock?.tabId===tabId&&folderScanLock.taken)return;
 try{const tab=await chrome.tabs.get(tabId),window=await chrome.windows.get(tab.windowId);if(!window.focused&&tab.url?.startsWith('https://x.com/'))await chrome.tabs.remove(tabId);}catch{}
}
async function automaticFolders(){
 const settings=await chrome.storage.local.get(['folderAutoEnabled','folderAccount','folderToken','folderScanLock','folderLastAttempt']);
 if(!settings.folderAutoEnabled||!settings.folderToken||!await chrome.permissions.contains(X_ACCESS))return;
 if(settings.folderScanLock&&Date.now()-settings.folderScanLock.started<300000)return;
 if(Date.now()-(settings.folderLastAttempt||0)<45000)return;
 await closeFolderTab(settings.folderScanLock?.tabId);
 const started=Date.now();let tab;
 try{
  await chrome.storage.local.set({folderLastAttempt:started,folderSyncError:'',folderRunning:true});
  // An inactive tab stops X's virtualized timeline from rendering. A selected
  // tab in its own unfocused window renders without switching the user's tab.
  const window=await chrome.windows.create({url:'https://x.com/i/history',type:'normal',focused:false,width:1100,height:850});
  tab=window.tabs?.[0];if(!tab?.id)throw Error('Could not open the X folder check.');
  await chrome.storage.local.set({folderScanLock:{tabId:tab.id,windowId:window.id,started}});
  const guard=async()=>{
   const current=await chrome.tabs.get(tab.id),s=await chrome.storage.local.get(['folderAutoEnabled','folderScanLock']);
   if(!s.folderAutoEnabled)throw Error('Automatic folders turned off.');
   const window=await chrome.windows.get(current.windowId);
   if(window.focused||s.folderScanLock?.taken)throw Error('Folder check paused while its temporary window is in use. It will retry.');
   if(!(current.pendingUrl||current.url)?.startsWith('https://x.com/'))throw Error('X sign-in is needed. Open X in Chrome, then the check will retry.');
   if(Date.now()-started>240000)throw Error('Folder check took too long. It will retry.');
  };
  const driver={
   navigate:async path=>{await guard();if(!/^\/(?:i\/history|[A-Za-z0-9_]+\/status\/\d+\/history)$/.test(path))throw Error('Unexpected X page.');await chrome.tabs.update(tab.id,{url:'https://x.com'+path});const until=Date.now()+20000;while(true){await guard();const next=await chrome.tabs.get(tab.id);if(next.url?.startsWith('https://x.com/')&&!next.pendingUrl)break;if(Date.now()>until)throw Error('X did not finish opening. It will retry.');await new Promise(resolve=>setTimeout(resolve,250));}},
   step:async(action,args={})=>{await guard();const results=await chrome.scripting.executeScript({target:{tabId:tab.id},func:AutomaticFolders.domStep,args:[action,args]});if(!results[0]?.result)throw Error('Could not read X folders. It will retry.');return results[0].result;},
   pause:ms=>new Promise(resolve=>setTimeout(resolve,ms))
  };
  const scan=await AutomaticFolders.scan(driver,{account:settings.folderAccount});
  const upload=()=>({account_handle:scan.account_handle,complete:scan.complete,render_check:scan.render_check,observed_at:scan.observed_at,folders:scan.folders,edit_families:scan.edit_families});
  const inspection=await folderCloud('inspect',upload());
  if(inspection.unmatched_ids?.length)await AutomaticFolders.histories(driver,scan,inspection.unmatched_ids);
  await guard();const applied=await folderCloud('apply',upload());if(!applied.ok)throw Error(applied.message||'Confirming folder changes with a second check.');
  await chrome.storage.local.set({folderLastSuccess:Date.now(),folderSyncError:''});
  chrome.tabs.query({url:CAPTURE_CONFIG.base+'/*'}).then(pages=>{for(const page of pages)chrome.tabs.sendMessage(page.id,{type:'folders-updated'}).catch(()=>{});}).catch(()=>{});
 }catch(e){
  const message=String(e.message||'Folder check interrupted.').slice(0,300);
  await chrome.storage.local.set({folderSyncError:message});
  await folderCloud('error',{message}).catch(()=>{});
  if(e.status===401)await stopAutomaticFolders(false);
  else await chrome.alarms.create('folders-retry',{delayInMinutes:2});
 }finally{
  await closeFolderTab(tab?.id);
  await chrome.storage.local.set({folderRunning:false,folderScanLock:null});
 }
}
function requestFolderRun(){if(!folderRun)folderRun=automaticFolders().finally(()=>{folderRun=null;});return folderRun;}
async function registerFolderHints(){
 await chrome.scripting.unregisterContentScripts({ids:['folder-hints']}).catch(()=>{});
 if(!await chrome.permissions.contains(X_ACCESS))return;
 await chrome.scripting.registerContentScripts([{id:'folder-hints',matches:['https://x.com/*'],js:['folder-hints.js'],runAt:'document_idle',persistAcrossSessions:true}]);
 // Existing X tabs receive the hint listener too; it is idempotent.
 for(const tab of await chrome.tabs.query({url:'https://x.com/*'}))await chrome.scripting.executeScript({target:{tabId:tab.id},files:['folder-hints.js']}).catch(()=>{});
}
async function stopAutomaticFolders(notify=true){
 await chrome.storage.local.set({folderAutoEnabled:false,folderRunning:false});
 for(const name of ['folders-periodic','folders-dirty','folders-retry'])await chrome.alarms.clear(name);
 await chrome.scripting.unregisterContentScripts({ids:['folder-hints']}).catch(()=>{});
 const {folderScanLock}=await chrome.storage.local.get('folderScanLock');await closeFolderTab(folderScanLock?.tabId);
 await chrome.permissions.remove(X_ACCESS);
 if(notify)await folderCloud('disconnect').then(()=>chrome.storage.local.set({folderPendingDisconnect:false})).catch(()=>chrome.storage.local.set({folderPendingDisconnect:true}));
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 const app=sender.url?.startsWith(CAPTURE_CONFIG.base+'/'),options=sender.url===chrome.runtime.getURL('options.html');
 if(app&&message.type==='connect-folders'&&/^[a-f0-9]{64}$/.test(message.token||'')&&/^[a-z0-9_]{1,15}$/i.test(message.account||'')){
  (async()=>{await chrome.storage.local.set({folderToken:message.token,folderAccount:message.account.toLowerCase()});await chrome.runtime.openOptionsPage();reply({ok:true});})().catch(()=>reply({ok:false}));return true;
 }
 if(app&&message.type==='disconnect-folders'){stopAutomaticFolders().then(()=>reply({ok:true}));return true;}
 if(options&&message.type==='folder-status'){
  chrome.storage.local.get(['folderToken','folderAccount','folderAutoEnabled','folderRunning','folderSyncError','folderLastSuccess']).then(s=>reply({connected:!!s.folderToken,account:s.folderAccount,enabled:!!s.folderAutoEnabled,running:!!s.folderRunning,error:s.folderSyncError,lastSuccess:s.folderLastSuccess}));return true;
 }
 if(options&&message.type==='folder-enable'){
  (async()=>{const s=await chrome.storage.local.get('folderToken');if(!s.folderToken||!await chrome.permissions.contains(X_ACCESS))throw Error('Allow X access to enable automatic folders.');await chrome.storage.local.set({folderAutoEnabled:true});await registerFolderHints();await chrome.alarms.create('folders-periodic',{periodInMinutes:15});reply({ok:true});requestFolderRun();})().catch(e=>reply({ok:false,error:e.message}));return true;
 }
 if(options&&message.type==='folder-disable'){stopAutomaticFolders().then(()=>reply({ok:true}));return true;}
 if(message.type==='folder-dirty'&&sender.url?.startsWith('https://x.com/'))chrome.storage.local.get('folderAutoEnabled').then(s=>{if(s.folderAutoEnabled)chrome.alarms.create('folders-dirty',{delayInMinutes:1});});
});
chrome.alarms.onAlarm.addListener(alarm=>{if(['folders-periodic','folders-dirty','folders-retry'].includes(alarm.name))requestFolderRun();});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='retry-cloud')chrome.storage.local.get('folderPendingDisconnect').then(async s=>{if(s.folderPendingDisconnect)try{await folderCloud('disconnect');await chrome.storage.local.set({folderPendingDisconnect:false});}catch(e){if(e.status===401)await chrome.storage.local.set({folderPendingDisconnect:false});}});});
const resumeFolders=()=>{chrome.storage.local.get('folderAutoEnabled').then(async s=>{if(s.folderAutoEnabled){await registerFolderHints();await chrome.alarms.create('folders-periodic',{periodInMinutes:15});requestFolderRun();}});};
chrome.runtime.onStartup.addListener(resumeFolders);
chrome.runtime.onInstalled.addListener(()=>{(async()=>{const {folderScanLock}=await chrome.storage.local.get('folderScanLock');await closeFolderTab(folderScanLock?.tabId);await chrome.storage.local.set({folderScanLock:null,folderLastAttempt:0,folderRunning:false});resumeFolders();})().catch(()=>{});});
chrome.windows.onFocusChanged.addListener(windowId=>{chrome.storage.local.get('folderScanLock').then(s=>{if(s.folderScanLock?.windowId===windowId)chrome.storage.local.set({folderScanLock:{...s.folderScanLock,taken:true}});});});
chrome.tabs.onActivated.addListener(info=>{chrome.storage.local.get('folderScanLock').then(s=>{if(s.folderScanLock?.windowId===info.windowId&&s.folderScanLock.tabId!==info.tabId)chrome.storage.local.set({folderScanLock:{...s.folderScanLock,taken:true}});});});
chrome.permissions.onRemoved.addListener(()=>{Promise.all([chrome.permissions.contains(X_ACCESS),chrome.storage.local.get('folderAutoEnabled')]).then(([ok,s])=>{if(!ok&&s.folderAutoEnabled)stopAutomaticFolders();});});
