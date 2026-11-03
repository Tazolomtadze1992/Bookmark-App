// Decode before revealing a control, but never leave it inert after a failed asset.
export function waitForImages(images,{timeoutMs=6000}={}){
 return Promise.all([...images].map(image=>new Promise(resolve=>{
  let settled=false;
  const finish=()=>{
   if(settled)return;settled=true;clearTimeout(timer);
   image.removeEventListener('load',loaded);image.removeEventListener('error',finish);resolve();
  };
  const loaded=()=>Promise.resolve().then(()=>image.decode?.()).then(finish,finish);
  const timer=setTimeout(finish,timeoutMs);
  if(image.complete)loaded();
  else{image.addEventListener('load',loaded,{once:true});image.addEventListener('error',finish,{once:true});}
 })));
}
export function waitForFont(fonts,{timeoutMs=6000}={}){
 if(!fonts?.load)return Promise.resolve();
 return new Promise(resolve=>{
  const finish=()=>{clearTimeout(timer);resolve();};
  const timer=setTimeout(finish,timeoutMs);
  Promise.resolve().then(()=>fonts.load('500 13px Inter')).then(finish,finish);
 });
}
