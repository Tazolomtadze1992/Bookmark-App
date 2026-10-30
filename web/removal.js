// Keep original neighbors rather than an index that shifts after other removals.
export function restoreReference(captures,item,following){
 if(captures.some(i=>i.id===item.id))return captures;
 const after=new Set(following),next=captures.findIndex(i=>after.has(i.id));
 const at=next<0?captures.length:next;
 return [...captures.slice(0,at),item,...captures.slice(at)];
}
// One saved mutation per item. Each Undo belongs to that particular removal,
// so an old toast cannot restore a newer removal of the same reference.
export function createRemovalController({request,onRemoved,onRestored,notify}){
 const entries=new Map();
 function remove(item){
  if(entries.has(item.id))return entries.get(item.id).pending;
  const entry={removed:false,restoring:null,pending:null};entries.set(item.id,entry);
  const undo=()=>{
   if(entries.get(item.id)!==entry||!entry.removed)return Promise.resolve();
   if(entry.restoring)return entry.restoring;
   entry.restoring=(async()=>{
    await request('/api/restore',{id:item.id,deletedAt:entry.deletedAt});
    await onRestored(item,entry.snapshot);entry.removed=false;entries.delete(item.id);
   })().finally(()=>{entry.restoring=null;});
   return entry.restoring;
  };
  entry.pending=(async()=>{
   try{
    const result=await request('/api/trash',{id:item.id});
    entry.deletedAt=result.deletedAt;entry.removed=true;
    entry.snapshot=await onRemoved(item);
    notify(item.kind==='website'?'Website removed':'Bookmark removed',undo,()=>{
     if(entries.get(item.id)===entry&&!entry.restoring)entries.delete(item.id);
    });
   }catch(error){if(!entry.removed)entries.delete(item.id);throw error;}
  })();
  return entry.pending;
 }
 return {remove};
}
