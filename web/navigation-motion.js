// The selected control updates immediately. Only the result grid waits for its
// short exit; a new intent always cancels the previous journey from its current pose.
export function createNavigationMotion(grid,render,{
 reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches,
 readPose=()=>({opacity:getComputedStyle(grid).opacity,transform:getComputedStyle(grid).transform})
}={}){
 let revision=0,running=null;
 const cancel=()=>{running?.cancel();running=null;};
 const clear=()=>{grid.inert=false;grid.removeAttribute('aria-busy');};
 async function update({animate=true,direction=0}={}){
  const current=++revision,pose=readPose();cancel();
  if(!animate||typeof grid.animate!=='function'){clear();render();return;}
  const reduced=reducedMotion();
  grid.inert=true;grid.setAttribute('aria-busy','true');
  try{
   running=grid.animate([pose,{opacity:0,transform:pose.transform}],{duration:reduced?50:70,easing:'ease',fill:'both'});
   await running.finished;
   if(current!==revision)return;
   cancel();render();grid.inert=false;
   running=grid.animate([
    {opacity:0,transform:reduced?'none':`translate(${direction*6}px, ${direction?0:4}px)`},
    {opacity:1,transform:'none'}
   ],{duration:reduced?100:180,easing:'cubic-bezier(.19,1,.22,1)',fill:'both'});
   await running.finished;
  }catch(error){
   if(current!==revision)return;
   // Unsupported animation or render failures never leave the collection locked.
   if(error.name!=='AbortError')throw error;
  }finally{
   if(current===revision){cancel();clear();}
  }
 }
 return {update,settle(){++revision;cancel();clear();}};
}
