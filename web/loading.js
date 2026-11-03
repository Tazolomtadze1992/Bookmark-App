import {createSkeletonBox} from './skullet.js';
import {createLoadQueue} from './load-queue.js';

const queue=createLoadQueue({limit:4}),previews=new Map(),nearby=new Set();
const node=(tag,cls)=>Object.assign(document.createElement(tag),{className:cls});
export function skeletonBox(className='loading-bone'){
 const bone=createSkeletonBox({width:'100%',height:'100%',radius:'inherit'});
 bone.className=className;bone.setAttribute('aria-hidden','true');return bone;
}
// One observer for the entire collection. Only near-screen previews enter the queue.
const observer=new IntersectionObserver(entries=>{
 for(const entry of entries){const preview=previews.get(entry.target);if(preview){preview.near=entry.isIntersecting;if(preview.near)nearby.add(preview);else nearby.delete(preview);preview.sync();}}
},{rootMargin:'320px 0px'});
let scrollFrame=0;
window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;for(const preview of nearby)preview.sync();});},{passive:true,capture:true});
export function acquirePreview(key,load,options={}){return queue.acquire(key,load,{priority:-1,...options});}

export function watchPreview(element,key,load,{dispose}={}){
 let request=null,done=false,destroyed=false;
 const preview={near:false,sync(){
  if(done||destroyed)return;
  const eligible=preview.near&&!element.closest('[hidden]')&&!document.hidden;
  element.dataset.near=String(eligible);
  if(!eligible){request?.release();request=null;return;}
  const rect=element.getBoundingClientRect(),priority=rect.bottom>0&&rect.top<innerHeight?0:1;
  if(request){request.priority(priority);return;}
  const current=queue.acquire(key,load,{priority,dispose});request=current;
  current.promise.then(value=>{
   if(request!==current||destroyed)return;
   done=true;nearby.delete(preview);element.dispatchEvent(new CustomEvent('preview-ready',{detail:value}));
   observer.unobserve(element);
  }).catch(error=>{
   if(request!==current||destroyed||error.name==='AbortError')return;
   done=true;nearby.delete(preview);element.dispatchEvent(new CustomEvent('preview-error',{detail:error}));observer.unobserve(element);
  });
 }};
 previews.set(element,preview);observer.observe(element);
 return ()=>{destroyed=true;observer.unobserve(element);previews.delete(element);nearby.delete(preview);request?.release();};
}
export function syncPreviews(){for(const preview of previews.values())preview.sync();}
document.addEventListener('visibilitychange',syncPreviews);

export function showLoadingGrid(grid,section){
 grid.className=section==='x_post'?'masonry':'web-grid';grid.setAttribute('aria-busy','true');
 for(let i=0;i<8;i++){
  const card=node('div',section==='x_post'?'card loading-card':'website-card loading-card');card.setAttribute('aria-hidden','true');
  const surface=node('div','loading-surface');surface.style.aspectRatio=section==='website'?'1.88':String([1.2,.8,1,1.4][i%4]);surface.append(skeletonBox());card.append(surface);
  if(section==='website'){const title=node('div','loading-title');title.append(skeletonBox());card.append(title);}
  grid.append(card);
 }
 measureLoadingGrid(grid);
}
export function measureLoadingGrid(grid){if(grid.classList.contains('masonry'))for(const surface of grid.querySelectorAll('.loading-surface'))surface.parentElement.style.gridRowEnd=`span ${Math.ceil(surface.getBoundingClientRect().height+12)}`;}
export function clearLoadingGrid(grid){for(const card of grid.querySelectorAll('.loading-card'))card.remove();grid.removeAttribute('aria-busy');}
