// This optional script emits a dirty hint only; it never transmits page text.
// Full results come from the extension's separate, account-checked scan.
if(!globalThis.referenceFolderHints){globalThis.referenceFolderHints=true;document.addEventListener('click',event=>{
 if(!event.isTrusted)return;
 if(event.target.closest('[data-testid="bookmark"],[data-testid="removeBookmark"],[role="menuitemradio"],[role="menuitemcheckbox"]'))chrome.runtime.sendMessage({type:'folder-dirty'}).catch(()=>{});
},true);}
