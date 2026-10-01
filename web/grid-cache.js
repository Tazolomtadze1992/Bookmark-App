// Keep filtered media connected: moving/replacing a playing video can restart it.
// A bounded hidden cache supports quick returns without retaining a whole library.
export function createGridCache(grid,fingerprint,create,{hiddenLimit=40}={}){
 const records=new Map();let revision=0;
 const discard=(id,record)=>{record.dispose();record.node.remove();records.delete(id);};
 return {reconcile(allItems,visibleItems){
  const valid=new Map(allItems.map(item=>[item.id,item])),visible=new Set(visibleItems.map(item=>item.id));
  ++revision;
  for(const [id,record] of records){
   const item=valid.get(id);
   if(!item||record.fingerprint!==fingerprint(item)){discard(id,record);continue;}
   record.node.hidden=!visible.has(id);
  }
  // Only move a node if its actual visible order changed. Hiding a sibling must
  // never detach an unchanged card or its video from the document.
  let cursor=[...grid.children].find(node=>!node.hidden)||null;
  for(const item of visibleItems){
   let record=records.get(item.id);
   if(!record){record={...create(item),fingerprint:fingerprint(item)};records.set(item.id,record);}
   record.used=revision;record.node.hidden=false;
   if(record.node!==cursor)grid.insertBefore(record.node,cursor);
   cursor=record.node.nextElementSibling;
   while(cursor?.hidden)cursor=cursor.nextElementSibling;
  }
  const hidden=[...records].filter(([,record])=>record.node.hidden).sort((a,b)=>b[1].used-a[1].used);
  for(const [id,record] of hidden.slice(hiddenLimit))discard(id,record);
 }};
}
