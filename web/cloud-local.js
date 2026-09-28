const token=document.querySelector('meta[name="local-token"]').content;
const status=document.querySelector('#status'),form=document.querySelector('#connect');
let busy=false;
async function request(path,body){const response=await fetch(path,{method:body?'POST':'GET',headers:{'X-Capture-Token':token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({...body,confirm:true}):undefined});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not connect.');return result;}
function render(s){status.textContent=`${s.message} ${s.synced} synced · ${s.pending} waiting`;document.querySelector('#controls').hidden=!s.connected;form.hidden=s.connected&&!s.needs_sign_in;document.querySelector('[data-action="pause"]').disabled=!s.enabled;document.querySelector('[data-action="resume"]').disabled=s.enabled;}
async function refresh(){if(!busy)try{render(await request('/api/cloud/status'));}catch(e){status.textContent=e.message;}}
form.addEventListener('submit',async e=>{e.preventDefault();busy=true;form.querySelector('button').disabled=true;try{render(await request('/api/cloud/connect',{email:document.querySelector('#email').value.trim()}));}catch(e){status.textContent=e.message;}finally{busy=false;form.querySelector('button').disabled=false;}});
for(const button of document.querySelectorAll('[data-action]'))button.addEventListener('click',async()=>{busy=true;try{render(await request('/api/cloud/control',{action:button.dataset.action}));}catch(e){status.textContent=e.message;}finally{busy=false;}});
refresh();setInterval(refresh,5000);
