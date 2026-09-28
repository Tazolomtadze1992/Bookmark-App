import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {SCOPES,newPrefix,projectPost,normalise,digest} from './logic.js';
const ORIGIN='https://bookmark-app-nu-seven.vercel.app';
const URL_BASE=Deno.env.get('SUPABASE_URL')!;
const db=createClient(URL_BASE,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const callback=URL_BASE+'/functions/v1/library-service/oauth/callback';
async function rpc(action:string,owner:string|null=null,payload:object={}){const {data,error}=await db.rpc('library_worker',{action,owner,payload});if(error)throw Error(error.message);return data;}
function response(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-device-token','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}});}
async function xRequest(path:string,token?:string,form?:Record<string,string>){
 const r=await fetch('https://api.x.com'+path,{method:form?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:form?{'Content-Type':'application/x-www-form-urlencoded'}:{Authorization:'Bearer '+token},body:form?new URLSearchParams(form):undefined});
 if(!r.ok){await r.body?.cancel();throw Error(r.status===401||r.status===403?'Reconnect X to continue.':r.status===429?'X rate limit reached. Checks paused.':`X request failed (${r.status}). Checks paused.`);}
 const reader=r.body!.getReader();let text='',size=0;const decoder=new TextDecoder();
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3000000){await reader.cancel();throw Error('X response exceeded the size limit.');}text+=decoder.decode(value,{stream:true});}
 const result=JSON.parse(text+decoder.decode());if(result.errors?.length)throw Error('Some X posts are unavailable. Checkpoint preserved.');return result;
}
function credentials(token:any,client_id:string,previous:any={}){
 const scopes=String(token.scope||'').split(' ');
 if(!SCOPES.split(' ').every(s=>scopes.includes(s))||scopes.some(s=>s.endsWith('.write'))||!token.access_token)throw Error('X did not grant the required read-only permissions.');
 return {client_id,access_token:token.access_token,refresh_token:token.refresh_token||previous.refresh_token,scope:token.scope,expires_at:Date.now()/1000+Number(token.expires_in||7200)};
}
function ids(result:any){if(!Array.isArray(result.data)&&result.meta?.result_count!==0)throw Error('Unexpected X response. Checkpoint preserved.');const list=(result.data||[]).map((p:any)=>p.id);if(!list.every((id:any)=>typeof id==='string'&&/^\d{1,25}$/.test(id)))throw Error('Invalid X post identifiers.');return list;}
async function writePost(owner:string,post:any,includes:any,refresh=false){
 const url=`https://x.com/i/status/${post.id}`,id=(await digest(url)).slice(0,32),now=new Date().toISOString();
 const {data:existing,error}=await db.from('library_references').select('id,record,deleted_at').eq('user_id',owner).eq('id',id).maybeSingle();if(error)throw Error('Could not read the saved reference.');
 if(existing?.deleted_at)return; // A later sync never resurrects a deleted card.
 if(existing&&!refresh)return;
 const record=existing?{...existing.record,updated_at:now}:{id,url,post_id:post.id,kind:'x_post',title:String(post.text||'').slice(0,500),description:String(post.text||'').slice(0,10000),created_at:now,updated_at:now,capture_origin:'x_bookmark',has_preview:false,fixture:false,capture_attempts:0};
 const row={user_id:owner,id,record,saved_at:now,...projectPost(post,includes)};
 const write=existing?db.from('library_references').update(row).eq('user_id',owner).eq('id',id).is('deleted_at',null):db.from('library_references').upsert(row,{onConflict:'user_id,id',ignoreDuplicates:true});
 const {error:writeError}=await write;if(writeError)throw Error('Could not save the X reference. Checkpoint preserved.');
}
async function run(owner:string,manual=false,refreshId?:string){
 const work=await rpc('claim',owner,{manual});if(!work)return {message:'A check is already running or was just completed.'};
 const {lease,state}=work;let creds=work.credentials;
 const finish=(patch:object)=>rpc('finish',owner,{lease,state:patch});
 try{
  if(!state.ready_at||!state.account_verified||!Array.isArray(state.baseline_ids)||!Array.isArray(state.anchors))throw Error('The historical-bookmark exclusion is incomplete. No bookmarks imported.');
  if(!creds.access_token)throw Error('Reconnect X to continue.');
  if(creds.expires_at<Date.now()/1000+60){
   if(!creds.refresh_token)throw Error('Reconnect X to continue.');
   const token=await xRequest('/2/oauth2/token',undefined,{grant_type:'refresh_token',refresh_token:creds.refresh_token,client_id:creds.client_id});
   creds=credentials(token,creds.client_id,creds);await rpc('credentials',owner,{lease,credentials:creds});
  }
  const get=async(path:string,units:number)=>{await rpc('reserve',owner,{lease,units});return xRequest(path,creds.access_token);};
  const lookup=async(list:string[])=>get('/2/tweets?'+new URLSearchParams({ids:list.join(','),'tweet.fields':'text,author_id,created_at,attachments',expansions:'attachments.media_keys,author_id','media.fields':'type,url,preview_image_url,variants,width,height,duration_ms,alt_text','user.fields':'name,username,profile_image_url'}),list.length*15);
  if(refreshId){
   const result=await lookup([refreshId]);if(ids(result).length!==1||result.data[0].id!==refreshId)throw Error('This post is no longer available.');
   await writePost(owner,result.data[0],result.includes,true);await finish({message:'Preview refreshed from X.'});return {message:'Preview refreshed.'};
  }
  let list:string[]=[],pagination='',used=new Set();
  for(let page=0;page<5;page++){
   const params=new URLSearchParams({max_results:'10'});if(pagination)params.set('pagination_token',pagination);
   const result=await get(`/2/users/${state.user_id}/bookmarks?`+params,50);list.push(...ids(result));pagination=result.meta?.next_token||'';
   if(list.some(id=>state.anchors.includes(id))||!pagination)break;
   if(used.has(pagination))throw Error('Repeated X page. Checkpoint preserved.');used.add(pagination);
  }
  if(!state.anchors.length&&pagination)throw Error('Incomplete bookmark window. No older posts imported.');
  const candidates=newPrefix(list,state.anchors,state.baseline_ids,state.seen_ids||[]);
  if(candidates.length>20)throw Error('More than 20 new bookmarks found. Checks paused for review.');
  if(candidates.length){const result=await lookup(candidates);const returned=ids(result);if(returned.length!==candidates.length||!candidates.every(id=>returned.includes(id)))throw Error('Some posts are unavailable. Checkpoint preserved.');for(const post of result.data)await writePost(owner,post,result.includes);}
  const message=`Last check: ${candidates.length} new bookmark(s). Old bookmarks remain excluded.`;
  await finish({seen_ids:[...new Set([...(state.seen_ids||[]),...candidates])],anchors:list.length?list.slice(0,10):state.anchors,last_check:Date.now()/1000,imported:(state.imported||0)+candidates.length,message});return {message};
 }catch(e){const message=e instanceof Error?e.message:'Cloud check failed. Checkpoint preserved.';await finish({enabled:false,message});throw Error(message);}
}
async function capture(owner:string,body:any){
 const {url,post_id}=normalise(body.url),id=(await digest(url)).slice(0,32),now=new Date().toISOString();
 if(body.fixture)throw Error('Test fixtures are not accepted into the real cloud collection.');
 const {data:old,error}=await db.from('library_references').select('record,deleted_at').eq('user_id',owner).eq('id',id).maybeSingle();if(error)throw Error('Could not read the reference.');
 if(old?.deleted_at)return {id,trashed:true,message:'This reference is in Trash. Restore it in the library.'};
 let has_preview=old?.record?.has_preview||false;
 if(body.preview_data_url){
  if(typeof body.preview_data_url!=='string'||!/^data:image\/jpeg;base64,/.test(body.preview_data_url)||body.preview_data_url.length>4000100)throw Error('Invalid preview.');
  const bytes=Uint8Array.from(atob(body.preview_data_url.split(',')[1]),c=>c.charCodeAt(0));
  if(bytes.length>3000000||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('Invalid JPEG preview.');
  const {error}=await db.storage.from('previews').upload(`${owner}/${id}.jpg`,bytes,{contentType:'image/jpeg',upsert:true});if(error)throw Error('Preview upload failed. Save remains queued.');has_preview=true;
 }
 const record={...old?.record,id,url,post_id,kind:post_id?'x_post':'website',title:String(body.title||url).slice(0,500),description:String(body.description||'').slice(0,10000),author_observed:String(body.author||'').slice(0,250),created_at:old?.record.created_at||now,updated_at:now,has_preview,capture_origin:'cloud_extension',capture_attempts:(old?.record.capture_attempts||0)+1,fixture:false};
 await rpc('capture_save',owner,{record,saved_at:now});
 return {id,has_preview,post_id};
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return response({});
 const route=new URL(req.url).pathname.split('/library-service')[1]||'/';
 try{
  if(route==='/oauth/callback'&&req.method==='GET'){
   const params=new URL(req.url).searchParams;
   const pending=await rpc('oauth_consume',null,{state:params.get('state')});
   if(!pending?.owner||!pending.verifier)throw Error('Connection link expired. Start again from your library.');
   if(!params.get('code')||params.get('error'))throw Error('X connection was not approved. Checks remain paused.');
   const work=await rpc('claim',pending.owner,{manual:true});if(!work)throw Error('Wait a minute, then start reconnecting again.');
   try{
    const token=await xRequest('/2/oauth2/token',undefined,{grant_type:'authorization_code',code:params.get('code')!,client_id:work.credentials.client_id,redirect_uri:callback,code_verifier:pending.verifier});
    const next=credentials(token,work.credentials.client_id);
    await rpc('reserve',pending.owner,{lease:work.lease,units:10});
    const identity=await xRequest('/2/users/me',next.access_token);
    if(identity.data?.id!==work.state.user_id)throw Error('Connect the same X account. Historical exclusions belong to that account.');
    await rpc('credentials',pending.owner,{lease:work.lease,credentials:next});
    await rpc('finish',pending.owner,{lease:work.lease,state:{enabled:false,message:'X reconnected. Resume checks when ready.'}});
    return Response.redirect(ORIGIN+'/?x=reconnected',303);
   }catch(e){await rpc('finish',pending.owner,{lease:work.lease,state:{enabled:false,message:'Reconnection failed. Reconnect the original X account.'}});throw e;}
  }
  if(req.method!=='POST')return response({error:'Method not allowed'},405);
  const origin=req.headers.get('origin');if(origin&&origin!==ORIGIN&&!origin.startsWith('chrome-extension://'))return response({error:'Origin not allowed'},403);
  if(route==='/cron'){
   if(!await rpc('cron_auth',null,{secret:req.headers.get('x-library-cron')||''}))return response({error:'Unauthorized'},401);
   const owners=await rpc('due');const task=(async()=>{for(const owner of owners.slice(0,1))try{await run(owner);}catch{/* State contains the safe failure message. */}})();
   // @ts-ignore Supabase Edge Runtime background lifetime
   EdgeRuntime.waitUntil(task);return response({accepted:true});
  }
  let owner:string;
  if(route==='/capture'){
   const token=req.headers.get('x-device-token')||'';if(!/^[a-f0-9]{64}$/.test(token))return response({error:'Connect this extension from your library.'},401);
   const device=await rpc('device_auth',null,{hash:await digest(token)});if(!device?.user_id)return response({error:'Extension connection expired or revoked. Reconnect it from your library.'},401);owner=device.user_id;
  }else{
   const auth=req.headers.get('authorization')||'';const {data,error}=await db.auth.getUser(auth.replace(/^Bearer /,''));if(error||!data.user)return response({error:'Sign in again to continue.'},401);owner=data.user.id;
  }
  if(Number(req.headers.get('content-length'))>4500000)return response({error:'Request too large'},413);
  const raw=await req.text();if(raw.length>4500000)return response({error:'Request too large'},413);const body=raw?JSON.parse(raw):{};
  if(route==='/capture')return response(await capture(owner,body));
  if(route==='/device'){const token=[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');await rpc('device_create',owner,{hash:await digest(token)});return response({token});}
  if(route==='/device/revoke'){await rpc('device_revoke',owner);return response({ok:true});}
  if(route==='/status')return response(await rpc('status',owner));
  if(route==='/reconnect'){
   const state=crypto.randomUUID(),verifier=(await digest(crypto.randomUUID()))+(await digest(crypto.randomUUID()));
   const pending=await rpc('oauth_prepare',owner,{state,verifier});if(!pending)throw Error('Migrate your existing X connection first.');
   const challenge=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
   return response({url:'https://x.com/i/oauth2/authorize?'+new URLSearchParams({response_type:'code',client_id:pending.client_id,redirect_uri:callback,scope:SCOPES,state,code_challenge:challenge,code_challenge_method:'S256'})});
  }
  if(route==='/control'){await rpc('control',owner,{enabled:body.enabled===true});return response({ok:true});}
  if(route==='/check')return response(await run(owner,true));
  if(route==='/refresh'){
   if(!/^[a-f0-9]{32}$/.test(body.id))throw Error('Invalid reference.');
   const {data,error}=await db.from('library_references').select('record').eq('user_id',owner).eq('id',body.id).is('deleted_at',null).single();if(error||!data.record.post_id)throw Error('Saved X post not found.');return response(await run(owner,true,data.record.post_id));
  }
  if(route==='/migrate'){
   if(!body.state?.ready_at||!body.state?.account_verified||!Array.isArray(body.state?.baseline_ids)||!Array.isArray(body.state?.seen_ids)||!Array.isArray(body.state?.anchors)||!/^\d+$/.test(body.state?.user_id)||!Number.isInteger(body.state?.reserved_units)||body.state.reserved_units<0||body.state.reserved_units>3000||!body.credentials?.refresh_token)throw Error('Incomplete migration. Nothing changed.');
   await rpc('import',owner,body);return response({ok:true});
  }
  return response({error:'Not found'},404);
 }catch(e){return response({error:e instanceof Error?e.message:'Cloud request failed.'},400);}
});
