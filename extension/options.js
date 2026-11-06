const enable=document.querySelector('#enable'),disable=document.querySelector('#disable'),status=document.querySelector('#status');
async function update(){
 const s=await chrome.runtime.sendMessage({type:'folder-status'});
 document.querySelector('#account').textContent=s.account?'Linked X account: @'+s.account:'Connect automatic folders from your library first.';
 enable.disabled=!s.connected;enable.hidden=s.enabled&&s.idleAccess;disable.hidden=!s.enabled;
 enable.textContent=s.enabled&&!s.idleAccess?'Allow idle checks':'Enable automatic sync';
 status.textContent=!s.idleAccess?'Allow idle checks to finish setup.':s.running?'Checking your X folders…':s.error|| (s.waiting?'Ready. The next check starts after a minute without input while Chrome is in front.':s.lastSuccess?'Last updated '+new Date(s.lastSuccess).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):s.enabled?'Automatic checks are enabled.':'Allow access to X to start automatic checks.');
}
enable.addEventListener('click',async()=>{
 // Chrome requires this permission request directly inside the owner's click.
 const granted=await chrome.permissions.request({origins:['https://x.com/*'],permissions:['idle']});
 if(!granted){status.textContent='Automatic sync stays off until X access is allowed.';return;}
 const result=await chrome.runtime.sendMessage({type:'folder-enable'});if(!result.ok)status.textContent=result.error;else await update();
});
disable.addEventListener('click',async()=>{await chrome.runtime.sendMessage({type:'folder-disable'});await update();});
update();setInterval(update,2500);
