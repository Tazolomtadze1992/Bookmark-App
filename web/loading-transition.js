// Match Skullet's 200ms "together" reveal: the old layer stays until the new one lands.
export function createLoadingTransitions({duration=()=>200,visible=()=>true,opacity=()=>1}={}){
 const active=new WeakMap();
 function settle(owner){active.get(owner)?.();}
 function reveal(owner,{skeleton,content=[],cleanup=()=>skeleton?.remove()}={}){
  settle(owner);
  const time=duration(owner),incoming=[...content].filter(node=>node&&visible(node));
  if(!skeleton||!time||!visible(skeleton)||typeof skeleton.animate!=='function'){
   cleanup();return Promise.resolve();
  }
  const animations=[];let done=false,resolve;
  const finished=new Promise(yes=>{resolve=yes;});
  const finish=()=>{
   if(done)return;done=true;active.delete(owner);cleanup();
   for(const animation of animations)animation.cancel();resolve();
  };
  active.set(owner,finish);
  const options={duration:time,easing:'ease',fill:'both'};
  animations.push(skeleton.animate([{opacity:opacity(skeleton)},{opacity:0}],options));
  for(const node of incoming)animations.push(node.animate([{opacity:0},{opacity:1}],options));
  Promise.allSettled(animations.map(animation=>animation.finished)).then(finish);
  return finished;
 }
 return {reveal,settle};
}
