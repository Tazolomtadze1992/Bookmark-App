// Share downloads, bound concurrency and let newly visible media jump the queue.
export function createLoadQueue({limit=4}={}){
 const entries=new Map();let active=0,scheduled=false,sequence=0;
 const abort=()=>new DOMException('Preview no longer needed','AbortError');
 function schedule(){if(!scheduled){scheduled=true;queueMicrotask(drain);}}
 function dispose(entry){if(entries.get(entry.key)===entry)entries.delete(entry.key);if(entry.value!==undefined)entry.dispose?.(entry.value);}
 function drain(){
  scheduled=false;
  const waiting=[...entries.values()].filter(e=>e.phase==='queued'&&e.clients.size)
   .sort((a,b)=>Math.min(...a.clients.values())-Math.min(...b.clients.values())||a.order-b.order);
  while(active<limit&&waiting.length){
   const entry=waiting.shift();entry.phase='running';active++;
   Promise.resolve().then(()=>entry.run(entry.controller.signal)).then(value=>{
    entry.value=value;entry.phase='ready';entry.resolve(value);
   },error=>{entry.phase='failed';entry.reject(error);}).finally(()=>{
    active--;if(!entry.clients.size||entry.phase==='failed')dispose(entry);schedule();
   });
  }
 }
 return {acquire(key,run,{priority=1,dispose:disposeValue}={}){
  let entry=entries.get(key);
  if(!entry){
   let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
   entry={key,run,dispose:disposeValue,promise,resolve,reject,clients:new Map(),controller:new AbortController(),phase:'queued',order:sequence++};
   entries.set(key,entry);
  }
  const client=Symbol();entry.clients.set(client,priority);schedule();
  return {promise:entry.promise,priority(value){if(entry.clients.has(client)){entry.clients.set(client,value);schedule();}},release(){
   if(!entry.clients.delete(client)||entry.clients.size)return;
   if(entry.phase==='queued'){entry.reject(abort());dispose(entry);}
   else if(entry.phase==='running'){
    // A new subscriber may start a replacement while this request unwinds.
    entries.delete(key);entry.controller.abort();
   }else dispose(entry);
  }};
 },get active(){return active;}};
}
