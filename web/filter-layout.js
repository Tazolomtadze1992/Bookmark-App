// FLIP on the existing card elements: playback and decoded previews survive.
// Retained cards stay opaque; only entering/leaving results use presence fades.
export function createFilterLayout(grid,{
 readPose=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,opacity:Number(getComputedStyle(node).opacity)};},
 inViewport=pose=>pose.y+pose.height>0&&pose.y<innerHeight&&pose.x+pose.width>0&&pose.x<innerWidth
}={}){
 const running=new Set(),exits=new Map();
 const cards=()=>[...grid.children].filter(node=>node.dataset.id);
 function stop(){
  for(const animation of running)animation.cancel();running.clear();
  for(const [node,restore] of exits)restore();exits.clear();
 }
 function run(node,frames,duration,done=()=>{}){
  const animation=node.animate(frames,{duration,easing:'cubic-bezier(.19,1,.22,1)',fill:'both'});
  running.add(animation);
  animation.finished.then(()=>{
   if(!running.delete(animation))return;
   animation.cancel();done();
  },()=>{});
 }
 return {
  capture(){return new Map(cards().filter(node=>!node.hidden).map(node=>[node,readPose(node)]));},
  stop,
  play(before){
   const current=cards(),after=new Map(current.filter(node=>!node.hidden).map(node=>[node,readPose(node)]));
   for(const [node,last] of after){
    if(typeof node.animate!=='function'||!inViewport(last))continue;
    const first=before.get(node);
    if(!first){run(node,[{opacity:0},{opacity:1}],120);continue;}
    const dx=first.x-last.x,dy=first.y-last.y;
    if(Math.abs(dx)<.5&&Math.abs(dy)<.5&&first.opacity>=.999)continue;
    // Translate only: preserving size avoids stretching images, badges and corners.
    run(node,[{transform:`translate(${dx}px, ${dy}px)`,opacity:first.opacity},{transform:'none',opacity:1}],240);
   }
   for(const [node,first] of before){
    if(after.has(node)||!current.includes(node)||typeof node.animate!=='function'||!inViewport(first))continue;
    const style=node.getAttribute('style'),inert=node.inert,aria=node.getAttribute('aria-hidden');
    const restore=()=>{
     node.hidden=true;node.inert=inert;node.removeAttribute('data-filter-exit');
     if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);
     if(aria===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',aria);
    };
    exits.set(node,restore);node.setAttribute('data-filter-exit','');node.hidden=false;node.inert=true;node.setAttribute('aria-hidden','true');
    // Pop exits out of layout at their CURRENT pose. This happens once, not per frame.
    Object.assign(node.style,{position:'fixed',left:`${first.x}px`,top:`${first.y}px`,width:`${first.width}px`,height:`${first.height}px`,margin:'0',pointerEvents:'none',zIndex:'2'});
    run(node,[{opacity:first.opacity},{opacity:0}],80,()=>{restore();exits.delete(node);});
   }
  }
 };
}
