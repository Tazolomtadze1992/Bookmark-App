// This optional script emits control hints only; it never transmits page text.
// Full results come from the extension's separate, account-checked scan.
if(!globalThis.referenceFolderHints){globalThis.referenceFolderHints=true;document.addEventListener('click',event=>{
 if(!event.isTrusted)return;
 if(event.target.closest('[data-testid="bookmark"],[data-testid="removeBookmark"],[role="menuitemradio"],[role="menuitemcheckbox"]'))chrome.runtime.sendMessage({type:'folder-dirty'}).catch(()=>{});
},true);
for(const type of ['pointerdown','keydown'])document.addEventListener(type,event=>{if(event.isTrusted)chrome.runtime.sendMessage({type:'folder-user-input'}).catch(()=>{});},true);
}
