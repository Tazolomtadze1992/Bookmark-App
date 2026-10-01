import {syncNotice} from './sync-status.js';
import {createDetailMotion} from './detail-motion.js';
import {folderOptions,inFolder,toggleFolder,validFolderSelection} from './folders.js';
import {mountCollectionMenu} from './collection-menu.js';
import {createNavigationMotion} from './navigation-motion.js';
const $ = s => document.querySelector(s);
const token = $('meta[name="local-token"]').content;
let state=null, section='x_post', query='', activeId=null,  returnFocus=null, pendingRefresh=false;
let selectedFolders=[],folderOptionSignature='';
const gridCleanups=[],detailCleanups=[],players=new Set(), imageCache=new Map();
const dialog=$('#detail');
let detailSource=null;
const detailMotion=createDetailMotion(dialog,()=>detailSource?.getBoundingClientRect());
const navigationMotion=createNavigationMotion($('#captures'),renderGrid);
function markDetailSource(id){detailSource?.classList.remove('detail-source');detailSource=document.querySelector(`[data-id="${id}"] .card-surface`);detailSource?.classList.add('detail-source');}
async function api(path,method='GET',data){const r=window.libraryAPI?await window.libraryAPI.request(path,method,data):await fetch(path,{method,headers:{'X-Capture-Token':token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});if(!r.ok){let e;try{e=await r.json();}catch{}throw Error(e?.error||'Could not reach your library.');}return r;}
function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function icon(name){const i=el('img');i.src=`/icons/${name}.svg`;i.alt='';return i;}
function btn(name,action,cls=''){const b=el('button',name,cls);b.type='button';if(name)b.setAttribute('aria-label',name);b.addEventListener('click',e=>{e.stopPropagation();Promise.resolve(action(e)).catch(error);});return b;}
function iconButton(name,label,action,cls=''){const b=btn('',action,`icon-button ${cls}`);b.append(icon(name));b.setAttribute('aria-label',label);b.title=label;return b;}
function actionMenu(label,actions){const menu=el('details',null,'utility-menu card-menu'),trigger=el('summary','More'),panel=el('div',null,'menu-panel');trigger.setAttribute('aria-label',label);for(const [name,action] of actions){panel.append(btn(name,async()=>{menu.open=false;await action();},'menu-item'));}menu.append(trigger,panel);return menu;}
document.addEventListener('click',e=>{for(const menu of document.querySelectorAll('.utility-menu[open]'))if(!menu.contains(e.target))menu.open=false;});
let menuEscapeHandled=false;
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;menuEscapeHandled=false;const menus=[...document.querySelectorAll('.utility-menu[open]')];if(menus.length){menuEscapeHandled=true;setTimeout(()=>{menuEscapeHandled=false;},250);e.preventDefault();e.stopImmediatePropagation();const active=menus.find(m=>m.contains(document.activeElement))||menus[0];for(const m of menus)m.open=false;active.querySelector('summary').focus();}},true);
document.addEventListener('toggle',e=>{const menu=e.target;if(menu.matches?.('.utility-menu')&&menu.open)for(const other of document.querySelectorAll('.utility-menu[open]'))if(other!==menu)other.open=false;},true);
function sourceLink(item,cls,label){const a=el('a',null,cls);a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',label);a.title=label;a.append(icon('arrow-up-right'));a.addEventListener('click',e=>e.stopPropagation());return a;}
function error(e){$('#status').textContent=e.message;if(dialog.open){let n=$('#detail-error');if(!n){n=el('p',null,'motion-note');n.id='detail-error';n.setAttribute('role','alert');$('#detail-footer').append(n);}n.textContent=e.message;}}
function metadata(item){return state.x_metadata?.[item.post_id]||{};}
function author(item){const m=metadata(item), observed=item.author_observed||'';return {name:m.author_name||observed.replace(/\s*@\w+\s*$/,'').trim()||'Author unavailable',handle:m.author_handle||observed.match(/@(\w+)\s*$/)?.[1]||'',avatar:m.avatar};}
function avatar(item){const a=author(item),img=el('img',null,'avatar');img.alt=a.name;if(a.avatar){img.src=a.avatar;img.addEventListener('error',()=>{img.src='/icons/user.svg';img.classList.add('fallback');},{once:true});}else{img.src='/icons/user.svg';img.classList.add('fallback');}return img;}
function postText(item){return metadata(item).text||item.description||item.title;}
function shortTitle(item){const text=postText(item).replace(/https?:\/\/\S+/g,'').trim();const first=text.split(/\n|(?<=[.!?])\s/)[0]||item.title;return first.length>92?first.slice(0,89).trimEnd()+'…':first;}
function date(value){if(!value)return '';const d=new Date(value);return Number.isNaN(+d)?'':d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});}
async function imageURL(item){const key=`${item.id}:${item.updated_at}`;if(!imageCache.has(key)){imageCache.set(key,api(`/api/image/${item.id}`).then(r=>r.blob()).then(b=>URL.createObjectURL(b)).catch(e=>{imageCache.delete(key);throw e;}));}return imageCache.get(key);}
function motionPreview(item,media,scope,mediaPoster){
if(scope==='detail'){const existing=[...players].find(p=>p.itemId===item.id&&p.url===media.url&&p.scope==='grid');if(existing){const borrowed=existing.borrow();detailCleanups.push(borrowed.restore);return borrowed.wrap;}}
const wrap=el('div',null,'motion-wrap'),video=el('video',null,'motion-video');video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='none';video.width=media.width;video.height=media.height;video.setAttribute('aria-label',`Video by ${author(item).name}`);const controls=el('div',null,'motion-controls'),note=el('p',null,'motion-note');note.setAttribute('role','status');let visible=false,disposed=false,blocked=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
async function sync(){if(disposed)return;if(!visible||document.hidden||(dialog.open&&scope==='grid')||reduced.matches){video.pause();return;}if(blocked)return;if(!video.src)video.src=media.url;try{await video.play();if(!disposed)note.textContent='';}catch(e){if(disposed||e.name==='AbortError')return;blocked=true;note.classList.remove('reduced-note');note.textContent=e.name==='NotAllowedError'?'Autoplay unavailable. Open the original post to watch.':'Preview unavailable. You can still open the original post.';controls.classList.add('needs-action');}}
wrap.style.setProperty('--media-ratio',media.width>0&&media.height>0?media.width/media.height:1);wrap.append(video,controls,note);video.addEventListener('error',()=>{blocked=true;note.classList.remove('reduced-note');note.textContent='Preview unavailable. You can still open the original post.';controls.classList.add('needs-action');});
const poster=mediaPoster===undefined?state.x_images?.[item.post_id]:mediaPoster;if(poster)video.poster=poster;else if(item.has_preview)imageURL(item).then(u=>{if(!disposed)video.poster=u;}).catch(()=>{});
const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=(scope==='detail'?.6:.1);sync();},{threshold:[.1,.6]});io.observe(wrap);const preference=()=>{note.classList.toggle('reduced-note',reduced.matches);note.textContent=reduced.matches?'Reduced motion: preview paused. Open the original post to watch.':'';controls.classList.toggle('needs-action',reduced.matches);sync();};if(reduced.matches){note.classList.add('reduced-note');note.textContent='Reduced motion: preview paused. Open the original post to watch.';controls.classList.add('needs-action');}reduced.addEventListener('change',preference);document.addEventListener('visibilitychange',sync);const player={sync,video,itemId:item.id,url:media.url,get scope(){return scope;},borrow(){
 const placeholder=el('div',null,'motion-placeholder');placeholder.style.aspectRatio=`${wrap.getBoundingClientRect().width} / ${wrap.getBoundingClientRect().height}`;wrap.before(placeholder);scope='detail';visible=true;
 return {wrap,restore(){scope='grid';video.muted=true;if(placeholder.isConnected){placeholder.replaceWith(wrap);}sync();}};
}};players.add(player);(scope==='detail'?detailCleanups:gridCleanups).push(()=>{disposed=true;io.disconnect();video.pause();video.removeAttribute('src');video.load();players.delete(player);reduced.removeEventListener('change',preference);document.removeEventListener('visibilitychange',sync);});return wrap;}
function mediaPreview(item,scope){const motion=state.motion?.[item.post_id];if(motion)return motionPreview(item,motion,scope);const remote=state.x_images?.[item.post_id];if(remote||item.has_preview){const img=el('img',null,'media media-image');img.alt=`Preview of ${item.kind==='x_post'?shortTitle(item):item.title}`;img.loading=scope==='detail'?'eager':'lazy';const known=metadata(item).media?.[0],source=document.querySelector(`[data-id="${item.id}"] .media-image`);if(known?.width&&known?.height){img.width=known.width;img.height=known.height;}else if(source?.naturalWidth){img.width=source.naturalWidth;img.height=source.naturalHeight;}if(remote)img.src=remote;else imageURL(item).then(u=>{img.src=u;}).catch(()=>{img.replaceWith(el('div','Preview unavailable. Open the source to view this reference.','text-preview'));});img.addEventListener('error',()=>img.replaceWith(el('div','Preview unavailable. Open the source to view this reference.','text-preview')),{once:true});return img;}return el('div',postText(item)||'Open the source to view this reference.','text-preview');}
// Keep the first attachment as the grid cover; expanded albums retain source order.
function albumItems(item){return metadata(item).media||[];}
function albumPreview(item){
 const attachments=albumItems(item),gallery=el('section',null,'album-gallery'),track=el('div',null,'album-track');
 gallery.setAttribute('aria-label','Post media gallery');track.tabIndex=0;track.setAttribute('aria-label','Images and videos. Use left and right arrows to browse.');
 const ratio=m=>m.width>0&&m.height>0?m.width/m.height:1;gallery.style.setProperty('--first-ratio',ratio(attachments[0]));gallery.style.setProperty('--last-ratio',ratio(attachments.at(-1)));
 let current=0;const slides=[],frames=[];let navigation=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const cancelNavigation=()=>{for(const a of navigation)a.cancel();navigation=[];};
 const counter=el('span',null,'sr-only');counter.setAttribute('role','status');counter.setAttribute('aria-live','polite');
 function update(){counter.textContent=`${current+1} / ${attachments.length}`;track.dataset.activeIndex=current;}
 function pose(){
  const center=track.scrollLeft+track.clientWidth/2,centers=slides.map(s=>s.offsetLeft+s.offsetWidth/2);
  current=centers.reduce((best,x,i)=>Math.abs(x-center)<Math.abs(centers[best]-center)?i:best,0);
  frames.forEach((frame,i)=>{
   const next=center<centers[i]?centers[i-1]:centers[i+1],distance=Math.abs((next??(centers[i]+slides[i].offsetWidth))-centers[i]);
   const scale=1-.25*Math.min(1,Math.abs(center-centers[i])/Math.max(1,distance));
   frame.style.transform=`scale(${scale})`;frame.dataset.scale=scale;
   frame.classList.toggle('album-neighbor',i!==current);
  });update();
 }
 function go(index,animated=false){
  if(!detailMotion.beforeNavigate())return;
  index=Math.max(0,Math.min(slides.length-1,index));
  const before=frames.map(f=>f.getBoundingClientRect());cancelNavigation();
  const target=slides[index];track.scrollTo({left:target.offsetLeft-(track.clientWidth-target.offsetWidth)/2,behavior:'instant'});pose();
  if(!animated||reduced.matches)return;
  // Scroll establishes the destination once; compositor transforms carry the visible journey.
  navigation=frames.map((frame,i)=>{
   const after=frame.getBoundingClientRect(),old=before[i],scale=Number(frame.dataset.scale);
   return frame.animate([
    {transform:`translate(${old.x+old.width/2-after.x-after.width/2}px, ${old.y+old.height/2-after.y-after.height/2}px) scale(${old.width/frame.offsetWidth})`},
    {transform:`scale(${scale})`}
   ],{duration:300,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
  });
  const run=navigation;Promise.allSettled(run.map(a=>a.finished)).then(()=>{if(navigation===run)cancelNavigation();});
 }
 for(const [index,media] of attachments.entries()){
  const slide=el('div',null,'album-slide');slide.style.setProperty('--media-ratio',ratio(media));slide.setAttribute('role','group');slide.setAttribute('aria-label',`Media ${index+1} of ${attachments.length}`);
  const frame=el('div',null,'album-frame');frame.style.transform=`scale(${index===0?1:.75})`;frame.dataset.scale=index===0?1:.75;frame.classList.toggle('album-neighbor',index!==0);
  frame.addEventListener('click',e=>{if(e.target.closest('.media-image,.motion-video,.text-preview')&&index!==current)go(index,true);});
  if(media.motion)frame.append(motionPreview(item,media.motion,'detail',media.poster));
  else if(media.poster){
   const img=el('img',null,'media media-image');img.alt=media.alt||`Image ${index+1} of ${attachments.length} — ${shortTitle(item)}`;img.loading='eager';
   if(media.width&&media.height){img.width=media.width;img.height=media.height;}
   img.src=media.poster;
   // Only the opened album loads eagerly. Decode late neighbors before fading in their pixels.
   let disposed=false,reveal=null;
   const pending=index>0&&!(img.complete&&img.naturalWidth);
   if(pending)img.style.opacity='0';
   const show=async()=>{
    try{await img.decode();}catch{return;}
    if(disposed||!img.isConnected||!pending)return;
    reveal=img.animate([{opacity:0},{opacity:1}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?100:160,easing:'ease',fill:'both'});
    reveal.finished.then(()=>{if(!disposed){img.style.opacity='';reveal?.cancel();}}).catch(()=>{});
   };
   img.addEventListener('error',()=>{if(!disposed)img.replaceWith(el('p','Image unavailable. Open the original post.','text-preview'));},{once:true});
   frame.append(img);
   if(pending)queueMicrotask(show);
   detailCleanups.push(()=>{disposed=true;reveal?.cancel();});
  }
  else frame.append(el('p','Media unavailable. Open the original post.','text-preview'));
  frames.push(frame);slide.append(frame);slides.push(slide);track.append(slide);
 }
 const beforeNavigate=e=>{if(!detailMotion.beforeNavigate())e.preventDefault();};
 let wheelTravel=0,wheelDirection=0,wheelLatched=false,wheelTimer;
 const resetWheel=()=>{clearTimeout(wheelTimer);wheelTravel=0;wheelDirection=0;wheelLatched=false;};
 track.addEventListener('pointerdown',beforeNavigate);
 track.addEventListener('wheel',e=>{
  if(e.ctrlKey)return;
  e.preventDefault();
  const unit=e.deltaMode===1?16:e.deltaMode===2?track.clientWidth:1;
  const delta=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*unit;
  if(!delta)return;
  const direction=Math.sign(delta);
  if(direction!==wheelDirection){wheelTravel=0;wheelLatched=false;wheelDirection=direction;}
  clearTimeout(wheelTimer);wheelTimer=setTimeout(resetWheel,160);
  if(wheelLatched)return;
  wheelTravel+=delta;
  if(Math.abs(wheelTravel)<24)return;
  // One destination per gesture, including its momentum tail. A reversal can retarget immediately.
  wheelLatched=true;
  const next=current+direction;
  if(next>=0&&next<slides.length)go(next,true);
 },{passive:false});
 track.addEventListener('scroll',pose,{passive:true});
 track.addEventListener('album-freeze',cancelNavigation);
 let size='';const resize=new ResizeObserver(()=>{const next=`${track.clientWidth}:${track.clientHeight}`;if(size&&size!==next)go(current);size=next;});resize.observe(track);
 reduced.addEventListener('change',cancelNavigation);
 detailCleanups.push(()=>{resize.disconnect();cancelNavigation();resetWheel();reduced.removeEventListener('change',cancelNavigation);});
 const onKey=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();go(current+(e.key==='ArrowRight'?1:-1));}};
 dialog.addEventListener('keydown',onKey);detailCleanups.push(()=>dialog.removeEventListener('keydown',onKey));
 gallery.append(track,counter);update();return gallery;
}
const resizeObserver=new ResizeObserver(entries=>{for(const {target} of entries){const card=target.parentElement;if(card?.parentElement?.classList.contains('masonry'))card.style.gridRowEnd=`span ${Math.ceil(target.getBoundingClientRect().height+12)}`;}});
function renderFolders(){
 const bar=$('#folder-bar'),filters=$('#folder-filters');
 bar.hidden=section!=='x_post'||!window.libraryAPI?.cloud;
 if(bar.hidden)return;
 const snapshot=state.bookmarks?.folder_snapshot,folders=folderOptions(snapshot);
 selectedFolders=validFolderSelection(selectedFolders,snapshot);
 const signature=JSON.stringify([folders.map(f=>[f.id,f.name]),!!snapshot?.synced_at]);
 if(signature!==folderOptionSignature){
  const focused=document.activeElement?.dataset.folder;
  folderOptionSignature=signature;filters.replaceChildren();
  const options=[{id:'all',name:'All'},...folders,...(snapshot?.synced_at?[{id:'unfiled',name:'Unfiled'}]:[])];
  for(const {id,name} of options){
   const pill=btn('',e=>{const next=toggleFolder(selectedFolders,id);if(JSON.stringify(next)===JSON.stringify(selectedFolders))return;filters.dataset.motion=e.detail>0?'animated':'instant';selectedFolders=next;renderFolders();return navigationMotion.update({animate:e.detail>0});},'header-button folder-pill');
   pill.append(el('span',name,'pill-label'));pill.setAttribute('aria-label',name);
   pill.dataset.folder=id;pill.title=name;filters.append(pill);
  }
  if(focused){const next=[...filters.children].find(pill=>pill.dataset.folder===focused)||filters.firstElementChild;next?.focus();}
 }
 for(const pill of filters.children)pill.setAttribute('aria-pressed',String(pill.dataset.folder==='all'?!selectedFolders.length:selectedFolders.includes(pill.dataset.folder)));
 const note=$('#folder-status');
 const allowancePaused=[state.bookmarks?.message,state.bookmarks?.folder_error].includes('Spending allowance reached');
 note.textContent=window.libraryAPI?.cloud?syncNotice(state.bookmarks,state.cloud_error):state.cloud_error?'Folder status unavailable':allowancePaused?'X sync paused — spending limit reached':state.bookmarks?.folder_error?'Folder sync needs attention':!snapshot?.synced_at?'Folders haven’t synced yet':folders.length?'':'Create folders on X to organize your bookmarks.';
 note.title=window.libraryAPI?.cloud?(state.bookmarks?.message||state.cloud_error||'Automatic X checks')+' · Manage connections at #manage.':allowancePaused?'New bookmarks and folder updates are paused by the app’s safety allowance. This estimate is not your actual X bill. See connections at #manage.':state.bookmarks?.folder_error||'Folder names and assignments come from X. Existing old-bookmark exclusions still apply.';
}
function filteredItems(){return state.captures.filter(i=>!i.fixture&&i.kind===section&&(section!=='x_post'||inFolder(i,selectedFolders,state.bookmarks?.folder_snapshot))&&(!query||[i.title,i.description,author(i).name,author(i).handle,i.url].join(' ').toLowerCase().includes(query)));}
function renderGrid(){if(!state)return;renderFolders();for(const c of gridCleanups.splice(0))c();resizeObserver.disconnect();const grid=$('#captures');grid.replaceChildren();grid.className=section==='x_post'?'masonry':'web-grid';const items=filteredItems();
if(!items.length){grid.className='web-grid';const empty=el('div',null,'empty');empty.append(el('h2',query?'No matching references':selectedFolders.length>0&&section==='x_post'?'No bookmarks in the selected folders':'Your collection starts here'),el('p',query?'Try another search.':selectedFolders.length>0&&section==='x_post'?'Folder assignments update from X. Only bookmarks already included in your library appear here.':section==='x_post'?(window.libraryAPI?.cloud?'Import your local collection to bring your saved references here.':'New bookmarks on X will appear after the next sync.'):'Save a website with the browser extension.'));grid.append(empty);return;}
for(const item of items){const card=el('article',null,section==='x_post'?'card':'website-card');card.dataset.id=item.id;if(section==='x_post'){const surface=el('div',null,'card-surface');surface.append(mediaPreview(item,'grid'));const open=btn('',e=>openDetail(item.id,open,e.detail>0),'open-card');open.setAttribute('aria-label',`Open reference: ${shortTitle(item)}`);surface.append(open);const count=albumItems(item).length;if(count>1){const badge=el('span',String(count),'album-count');badge.setAttribute('aria-label',`${count} media items`);surface.append(badge);}card.append(surface);grid.append(card);resizeObserver.observe(surface);}else{const image=el('a',null,'website-image');image.href=item.url;image.target='_blank';image.rel='noopener noreferrer';image.setAttribute('aria-label',`Visit ${item.title}`);image.append(mediaPreview(item,'grid'));const title=el('h2'),titleLink=el('a',item.title);titleLink.href=item.url;titleLink.target='_blank';titleLink.rel='noopener noreferrer';titleLink.title=item.title;title.append(titleLink);const url=el('a',new URL(item.url).hostname.replace(/^www\./,''),'website-url');url.href=item.url;url.target='_blank';url.rel='noopener noreferrer';card.append(image,title,url);if(window.libraryAPI?.cloud)card.append(actionMenu(`Actions for ${item.title}`,[['Move to Trash',async()=>{await api('/api/trash','POST',{id:item.id});await refresh();}]]));grid.append(card);}}
}
function syncSummary(){if(window.libraryAPI?.cloud){const b=state?.bookmarks;$('#sync-status').textContent=syncNotice(b,state?.cloud_error);$('#sync-status').title=b?.message||'';return;}const c=state?.cloud_sync;const cloudLabel=document.querySelector('#cloud-status');if(cloudLabel)cloudLabel.textContent=c?.needs_sign_in?'Cloud · Sign in again':c?.enabled?(c.pending?`Cloud · ${c.pending} waiting`:'Cloud · Saved'):'Cloud · Connect or resume';const b=state?.bookmarks;if(!b){$('#sync-status').textContent='Saved locally';return;}$('#sync-status').textContent=b.enabled?'X sync on · Checks every 15 minutes':b.phase==='ready'?'X sync paused · Manage in Capture Lab':'Connect X in Capture Lab';$('#sync-status').title=b.message||'';}
async function refresh(){const next=await(await api('/api/state')).json();if(dialog.open){state.bookmarks=next.bookmarks;state.cloud_sync=next.cloud_sync;syncSummary();pendingRefresh=true;return;}state=next;syncSummary();renderGrid();}
function renderDetail(){
 detailMotion.settle();for(const c of detailCleanups.splice(0))c();
 const item=state.captures.find(i=>i.id===activeId);if(!item){dialog.close();return;}
 dialog.setAttribute('aria-label',`Bookmark: ${shortTitle(item)}`);
 const source=sourceLink(item,'source-link','View on X');source.replaceChildren(document.createTextNode('View on'),icon('twitter'));$('#detail-footer').replaceChildren(source);
 const media=el('div',null,'detail-media'),album=albumItems(item).length>1;
 $('#detail-stage').classList.toggle('has-album',album);media.append(album?albumPreview(item):mediaPreview(item,'detail'));$('#detail-stage').replaceChildren(media);
}
let closingDetail=null,detailPointer=null;
function closeDetail(animate=true){detailPointer=null;if(!dialog.open)return Promise.resolve();if(closingDetail){if(!animate)detailMotion.settle();return closingDetail;}closingDetail=detailMotion.close(animate).finally(()=>{closingDetail=null;});return closingDetail;}
dialog.addEventListener('cancel',e=>{e.preventDefault();const menu=dialog.querySelector('.utility-menu[open]');if(menu){menu.open=false;menu.querySelector('summary').focus();return;}if(menuEscapeHandled)return;closeDetail();});
function openDetail(id,trigger,animate=true){
 if(dialog.open)return;
 activeId=id;returnFocus=trigger;
 const source=trigger.closest('.card-surface'),from=source?.getBoundingClientRect();
 document.body.classList.add('detail-open');dialog.showModal();renderDetail();markDetailSource(id);
 for(const p of players)p.sync();detailMotion.open(from,animate);$('#close-detail').focus({preventScroll:true});
}
$('#close-detail').addEventListener('click',()=>closeDetail());
const detailInteractive='button,a,input,select,textarea,summary,.media-image,.motion-video,.text-preview';
dialog.addEventListener('pointerdown',e=>{
 detailPointer={id:e.pointerId,x:e.clientX,y:e.clientY,background:!e.target.closest(detailInteractive),moved:false,cancelled:false};
},true);
const trackDetailPointer=e=>{
 if(detailPointer?.id===e.pointerId&&Math.hypot(e.clientX-detailPointer.x,e.clientY-detailPointer.y)>6)detailPointer.moved=true;
};
window.addEventListener('pointermove',trackDetailPointer,true);
window.addEventListener('pointerup',trackDetailPointer,true);
window.addEventListener('pointercancel',e=>{if(detailPointer?.id===e.pointerId)detailPointer.cancelled=true;},true);
dialog.addEventListener('click',e=>{
 // Capture also clears gestures whose media/control click stops propagation later.
 const gesture=e.detail>0?detailPointer:null;detailPointer=null;
 if(e.target.closest(detailInteractive)||gesture&&(!gesture.background||gesture.moved||gesture.cancelled))return;
 closeDetail(e.detail>0);
},true);

dialog.addEventListener('close',()=>{detailPointer=null;detailMotion.settle();for(const c of detailCleanups.splice(0))c();$('#detail-stage').replaceChildren();detailSource?.classList.remove('detail-source');detailSource=null;document.body.classList.remove('detail-open');activeId=null;closingDetail=null;for(const p of players)p.sync();returnFocus?.focus({preventScroll:true});if(pendingRefresh){pendingRefresh=false;const id=returnFocus?.closest('[data-id]')?.dataset.id;refresh().then(()=>{document.querySelector(`[data-id="${id}"] .open-card`)?.focus({preventScroll:true});}).catch(error);}});
mountCollectionMenu($('#collection-menu'),{value:section,onValueChange:(value,{animate})=>{const direction=value==='website'?1:-1;section=value;query='';if(state){renderFolders();navigationMotion.update({animate,direction}).catch(error);}}});
if(!window.libraryAPI?.cloud){const link=el('a','Cloud saves');link.id='cloud-status';link.href='/cloud';document.querySelector('.account-panel').append(link);}
if(!window.libraryAPI?.cloud){const management=$('#library-management');const showManagement=()=>{management.hidden=location.hash!=='#manage';};addEventListener('hashchange',showManagement);showManagement();}
window.addEventListener('library-refresh',()=>refresh().catch(error));
refresh().catch(error);
// Local reads only; browsing and searching never request paid X data.
setInterval(async()=>{if(document.hidden||!state)return;try{const next=await(await api('/api/state')).json();const signature=value=>JSON.stringify([value.captures.map(i=>[i.id,i.updated_at]),value.motion,value.x_images,value.x_metadata,value.bookmarks?.folder_snapshot,value.bookmarks?.folder_error,value.bookmarks?.message,value.cloud_error]);if(signature(next)!==signature(state)){if(dialog.open){pendingRefresh=true;return;}state=next;renderGrid();}else{state.bookmarks=next.bookmarks;state.cloud_error=next.cloud_error;state.cloud_sync=next.cloud_sync;}syncSummary();renderFolders();}catch{if(window.libraryAPI?.cloud)$('#folder-status').textContent='Could not refresh your library — check your connection';$('#sync-status').textContent=window.libraryAPI?.cloud?'Could not refresh your library · Check your connection':'Local server unavailable · Your saved cards are still on this Mac';}},15000);
