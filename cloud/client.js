import {createClient} from '@supabase/supabase-js';
const db=createClient(SUPABASE_URL,SUPABASE_KEY);
let user;
const main=document.querySelector('main');
const labLink=document.querySelector('.lab-link');
const personalLabel=document.querySelector('footer span:last-child');
const notice=document.createElement('p');notice.className='status';notice.setAttribute('role','status');
const login=document.createElement('form');login.className='cloud-login';
const title=document.createElement('h1');title.textContent='Your private library';
const description=document.createElement('p');description.textContent='Sign in with your email to open your saved references.';
const email=document.createElement('input');email.type='email';email.required=true;email.autocomplete='email';email.placeholder='Email address';email.setAttribute('aria-label','Email address');
const submit=document.createElement('button');submit.type='submit';submit.textContent='Email me a sign-in link';
login.append(title,description,email,submit,notice);
login.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;notice.textContent='Sending your sign-in link…';const {error}=await db.auth.signInWithOtp({email:email.value.trim(),options:{emailRedirectTo:location.origin+'/'}});notice.textContent=error?error.message:'Check your email and open the sign-in link on this device.';submit.disabled=false;});
function signedOut(){main.hidden=true;document.querySelector('nav').hidden=true;labLink.hidden=true;document.body.append(login);}
const initial=await db.auth.getSession();
if(initial.error)notice.textContent=initial.error.message;
if(!initial.data.session){signedOut();await new Promise(resolve=>{const {data:{subscription}}=db.auth.onAuthStateChange((event,session)=>{if(session){subscription.unsubscribe();resolve();}});});}
const verified=await db.auth.getUser();
if(verified.error||!verified.data.user){await db.auth.signOut();location.replace('/');throw Error('Sign in again to continue.');}
user=verified.data.user;
login.remove();main.hidden=false;document.querySelector('nav').hidden=false;labLink.hidden=false;
labLink.textContent='Sign out';labLink.href='#';labLink.addEventListener('click',async e=>{e.preventDefault();const {error}=await db.auth.signOut();if(error){document.querySelector('#status').textContent=error.message;return;}location.replace('/');});
personalLabel.textContent='Private · Saved in your account';
const reply=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const remoteMedia=(value,host)=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password&&(!u.port||u.port==='443')?u.href:null;}catch{return null;}};
window.libraryAPI={
 cloud:true,
 async request(path){
  if(path==='/api/state'){
   const rows=[];let offset=0;
   while(true){const {data,error}=await db.from('library_references').select('id,record,motion,poster,metadata').order('saved_at',{ascending:false}).order('id').range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)break;offset+=500;}
   const state={captures:[],motion:{},x_images:{},x_metadata:{},bookmarks:null};
   for(const row of rows){
    const item={...row.record,id:row.id};
    if(!/^https?:\/\//i.test(item.url)||!['website','x_post'].includes(item.kind))continue;
    state.captures.push(item);const pid=item.post_id;
    if(pid&&row.motion&&remoteMedia(row.motion.url,'video.twimg.com'))state.motion[pid]=row.motion;
    if(pid&&remoteMedia(row.poster,'pbs.twimg.com'))state.x_images[pid]=row.poster;
    if(pid&&row.metadata){state.x_metadata[pid]={...row.metadata,avatar:remoteMedia(row.metadata.avatar,'pbs.twimg.com')||''};}
   }
   return reply(state);
  }
  const image=path.match(/^\/api\/image\/([a-f0-9]{32})$/);
  if(image){const {data,error}=await db.storage.from('previews').download(`${user.id}/${image[1]}.jpg`);if(error)throw error;return new Response(data,{headers:{'Content-Type':'image/jpeg'}});}
  throw Error('This action is available in the local Capture Lab.');
 }
};
// A reviewed local export is imported only when its owner chooses a file.
const upload=document.createElement('input');upload.type='file';upload.accept='.json,application/json';upload.hidden=true;
const importButton=document.createElement('button');importButton.type='button';importButton.className='cloud-import';importButton.textContent='Import local collection';importButton.addEventListener('click',()=>upload.click());
document.querySelector('.toolbar').prepend(importButton,upload);
upload.addEventListener('change',async()=>{
 const file=upload.files[0];if(!file)return;const status=document.querySelector('#status');
 importButton.disabled=true;
 try{
  if(file.size>50000000)throw Error('This import is too large. Import fewer than 50 MB at a time.');
  const bundle=JSON.parse(await file.text());
  if(bundle.format!=='bookmark-app-transfer-v1'||!Array.isArray(bundle.references)||bundle.references.length>500)throw Error('Choose a Bookmark App transfer export.');
  for(const row of bundle.references){
   const item=row.record;
   if(!item||!item.id?.match(/^[a-f0-9]{32}$/)||!/^https?:\/\//i.test(item.url)||!['website','x_post'].includes(item.kind)||!Number.isFinite(Date.parse(item.created_at))||!Number.isFinite(Date.parse(item.updated_at)))throw Error('The export contains an invalid reference.');
   if(row.preview&&(!/^data:image\/jpeg;base64,/.test(row.preview)||row.preview.length>4000100))throw Error('The export contains an invalid preview.');
  }
  let count=0;
  for(const row of bundle.references){
   status.textContent=`Importing ${++count} of ${bundle.references.length}…`;
   const item=row.record;
   const {data:existing,error:readError}=await db.from('library_references').select('saved_at').eq('id',item.id).maybeSingle();if(readError)throw readError;
   if(existing&&Date.parse(existing.saved_at)>Date.parse(item.updated_at))continue;
   if(row.preview){const bytes=Uint8Array.from(atob(row.preview.split(',')[1]),c=>c.charCodeAt(0));const blob=new Blob([bytes],{type:'image/jpeg'});if(blob.size>3000000)throw Error('Preview exceeds the 3 MB limit.');const {error}=await db.storage.from('previews').upload(`${user.id}/${item.id}.jpg`,blob,{contentType:'image/jpeg',upsert:true});if(error)throw error;}
   const {error}=await db.from('library_references').upsert({user_id:user.id,id:item.id,record:item,saved_at:item.updated_at,motion:row.motion||null,poster:row.poster||null,metadata:row.metadata||{}},{onConflict:'user_id,id'});if(error)throw error;
  }
  location.reload();
 }catch(e){status.textContent=`Import stopped: ${e.message}. You can retry the same file; duplicates will not be created.`;}finally{importButton.disabled=false;upload.value='';}
});
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')location.replace('/');});
await import('/app.js');
