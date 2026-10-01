import {syncNotice} from '../web/sync-status.js';
import {createClient} from '@supabase/supabase-js';
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
let user;
const main=document.querySelector('main');
const labLink=document.querySelector('.lab-link');
const personalLabel=document.querySelector('#privacy-status');
const notice=document.createElement('p');notice.className='status';notice.setAttribute('role','status');
const login=document.createElement('form');login.className='cloud-login';
const title=document.createElement('h1');title.textContent='Your private library';
const description=document.createElement('p');description.textContent='Sign in with your email to open your saved references.';
const email=document.createElement('input');email.type='email';email.required=true;email.autocomplete='email';email.placeholder='Email address';email.setAttribute('aria-label','Email address');
const submit=document.createElement('button');submit.type='submit';submit.textContent='Email me a sign-in link';
login.append(title,description,email,submit,notice);
login.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;notice.textContent='Sending your sign-in link…';const {error}=await db.auth.signInWithOtp({email:email.value.trim(),options:{emailRedirectTo:location.origin+'/'}});notice.textContent=error?error.message:'Check your email and open the sign-in link on this device.';submit.disabled=false;});
function signedOut(){main.hidden=true;document.querySelector('nav').hidden=true;labLink.hidden=true;document.querySelector('#library-management').hidden=true;document.querySelector('#folder-bar').hidden=true;document.body.append(login);}
const initial=await db.auth.getSession();
if(initial.error)notice.textContent=initial.error.message;
if(!initial.data.session){signedOut();await new Promise(resolve=>{const {data:{subscription}}=db.auth.onAuthStateChange((event,session)=>{if(session){subscription.unsubscribe();resolve();}});});}
const verified=await db.auth.getUser();
if(verified.error||!verified.data.user){await db.auth.signOut({scope:'local'});location.replace('/');throw Error('Sign in again to continue.');}
user=verified.data.user;
login.remove();main.hidden=false;document.querySelector('nav').hidden=false;labLink.hidden=false;
labLink.textContent='Sign out';labLink.setAttribute('aria-label','Sign out');labLink.href='#';labLink.addEventListener('click',async e=>{e.preventDefault();const {error}=await db.auth.signOut({scope:'local'});if(error){document.querySelector('#status').textContent=error.message;return;}location.replace('/');});
personalLabel.textContent='Private · Saved in your account';
const reply=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const remoteMedia=(value,host)=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password&&(!u.port||u.port==='443')?u.href:null;}catch{return null;}};
window.libraryAPI={
 cloud:true,
 async request(path,method='GET',body){
  if(path==='/api/state'){
   const rows=[];let offset=0;
   while(true){const {data,error}=await db.from('library_references').select('id,record,motion,poster,metadata').is('deleted_at',null).order('saved_at',{ascending:false}).order('id').range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)break;offset+=500;}
   const state={captures:[],motion:{},x_images:{},x_metadata:{},bookmarks:null};
   for(const row of rows){
    const item={...row.record,id:row.id};
    if(!/^https?:\/\//i.test(item.url)||!['website','x_post'].includes(item.kind))continue;
    state.captures.push(item);const pid=item.post_id;
    if(pid&&row.motion&&remoteMedia(row.motion.url,'video.twimg.com'))state.motion[pid]=row.motion;
    if(pid&&remoteMedia(row.poster,'pbs.twimg.com'))state.x_images[pid]=row.poster;
    if(pid&&row.metadata){state.x_metadata[pid]={...row.metadata,avatar:remoteMedia(row.metadata.avatar,'pbs.twimg.com')||'',media:(Array.isArray(row.metadata.media)?row.metadata.media:[]).map(m=>({...m,poster:remoteMedia(m.poster,'pbs.twimg.com'),motion:m.motion&&remoteMedia(m.motion.url,'video.twimg.com')?m.motion:null}))};}
   }
   try{state.bookmarks=await cloudRequest('/status');}catch(e){state.cloud_error=e.message;}
   return reply(state);
  }
  const image=path.match(/^\/api\/image\/([a-f0-9]{32})$/);
  if(image){const {data,error}=await db.storage.from('previews').download(`${user.id}/${image[1]}.jpg`);if(error)throw error;return new Response(data,{headers:{'Content-Type':'image/jpeg'}});}
  if(path==='/api/trash'){
   const {error}=await db.from('library_references').update({deleted_at:new Date().toISOString()}).eq('id',body.id);if(error)throw error;return reply({ok:true});
  }
  if(path==='/api/refresh-media')return reply(await cloudRequest('/refresh',body));
  throw Error('This action is not available.');
 }
};
async function cloudRequest(path,body={}){
 const {data:{session},error}=await db.auth.getSession();if(error||!session)throw Error('Sign in again to continue.');
 const r=await fetch(SUPABASE_URL+'/functions/v1/library-service'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Cloud connection failed.');return data;
}
const tools=document.createElement('details');tools.className='cloud-tools';
const summary=document.createElement('summary');summary.textContent='Connections & Trash';summary.setAttribute('aria-label','Connections & Trash');
const panel=document.createElement('div');panel.className='cloud-panel';
const report=document.createElement('p');report.setAttribute('role','status');
function action(label,fn){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',label);button.addEventListener('click',async()=>{button.disabled=true;try{await fn();}catch(e){report.textContent=e.message;}finally{button.disabled=false;}});button.className='menu-item';panel.append(button);return button;}
async function connectionStatus(){const status=await cloudRequest('/status');report.textContent=status?`${syncNotice(status)}. ${status.message||''} · $${((status.allowance_used_units??status.reserved_units??0)/1000).toFixed(3)} of $${((status.budget_units||3000)/1000).toFixed(2)} ${status.budget_mode==='monthly'?'monthly ':''}allowance reserved (conservative estimate, not your actual X bill).${status.budget_mode==='monthly'?' Renews '+new Date(status.budget_reset_at*1000).toLocaleDateString()+'.':''} Bookmarks are checked every ${(status.check_interval_seconds||900)/60} minutes. Folder moves are checked daily and when new bookmarks arrive.`:'X cloud connection is not ready yet.';}

action('Connect extension',async()=>{
 if(document.documentElement.dataset.libraryExtension!=='cloud-v1')throw Error('Reload the updated Reference Library extension in Chrome, then reload this page.');
 const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{window.removeEventListener('message',listener);reject(Error('Extension did not respond. Reload it and try again.'));},10000);function listener(event){if(event.source===window&&event.origin===location.origin&&event.data?.type==='library-connected'){clearTimeout(timer);window.removeEventListener('message',listener);event.data.ok?resolve(event.data):reject(Error('Could not connect the extension.'));}}window.addEventListener('message',listener);});
 const {token}=await cloudRequest('/device');window.postMessage({type:'library-connect',token},location.origin);await ready;report.textContent='Extension connected. New saves go directly to your private cloud library.';
});
action('Check X now',async()=>{report.textContent='Checking X…';const result=await cloudRequest('/check');report.textContent=result.message;window.dispatchEvent(new Event('library-refresh'));});
action('Sync X folders now',async()=>{report.textContent='Syncing X folders…';const result=await cloudRequest('/folders/check');report.textContent=result.message;window.dispatchEvent(new Event('library-refresh'));});
action('Pause X checks',async()=>{await cloudRequest('/control',{enabled:false});await connectionStatus();window.dispatchEvent(new Event('library-refresh'));});
action('Resume X checks',async()=>{await cloudRequest('/control',{enabled:true});await connectionStatus();window.dispatchEvent(new Event('library-refresh'));});
action('Reconnect X',async()=>{const result=await cloudRequest('/reconnect');location.assign(result.url);});
action('Disconnect extensions',async()=>{await cloudRequest('/device/revoke');report.textContent='Extension connections revoked. Pending saves stay in their browser queues.';});
const trash=document.createElement('div');trash.className='trash-list';
action('Open Trash',async()=>{
 const {data,error}=await db.from('library_references').select('id,record').not('deleted_at','is',null);if(error)throw error;
 trash.replaceChildren();if(!data.length)trash.textContent='Trash is empty.';
 for(const row of data){const line=document.createElement('p'),button=document.createElement('button');line.append(document.createTextNode(row.record.title+' '));button.textContent='Restore';button.addEventListener('click',async()=>{button.disabled=true;const {error}=await db.from('library_references').update({deleted_at:null}).eq('id',row.id);if(error){report.textContent=error.message;button.disabled=false;return;}line.remove();window.dispatchEvent(new Event('library-refresh'));});line.append(button);trash.append(line);}
});
panel.append(report,trash);tools.append(summary,panel);
tools.addEventListener('toggle',()=>{if(tools.open)connectionStatus().catch(e=>{report.textContent=e.message;});});
document.querySelector('#connection-tools').append(tools);
// Connection recovery remains available at #manage without an account menu.
function managementView(){const visible=location.hash==='#manage';document.querySelector('#library-management').hidden=!visible;tools.open=visible;}
window.addEventListener('hashchange',managementView);managementView();
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')location.replace('/');});
await import('/app.js');
