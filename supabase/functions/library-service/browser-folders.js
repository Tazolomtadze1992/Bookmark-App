// Browser uploads contain folder names and IDs only. Never accept cards, media,
// credentials, or an arbitrary state patch from an extension.
const validId=id=>typeof id==='string'&&/^\d{1,25}$/.test(id);
export function validateBrowserFolders(body,expectedHandle,now=Date.now()/1000){
 if(body?.render_check!==3)throw Error('Reload the Reference Library extension to finish the folder loading fix.');
 if(!body||body.complete!==true||typeof body.account_handle!=='string'||body.account_handle.toLowerCase()!==expectedHandle.toLowerCase())throw Error('Sign in to the linked X account before syncing folders.');
 if(!Number.isFinite(body.observed_at)||body.observed_at<now-900||body.observed_at>now+60)throw Error('Folder scan expired. Retrying with a fresh scan.');
 if(!Array.isArray(body.folders)||body.folders.length>100)throw Error('Invalid folder list.');
 const folderIds=new Set();let total=0;
 const folders=body.folders.map(f=>{
  if(!f||!validId(f.id)||folderIds.has(f.id)||typeof f.name!=='string'||!f.name.trim()||f.name.length>500||f.complete!==true||!Array.isArray(f.post_ids)||f.post_ids.some(id=>!validId(id)))throw Error('Folder scan was incomplete. Previous assignments kept.');
  folderIds.add(f.id);total+=f.post_ids.length;if(total>10000)throw Error('Folder scan exceeded its size limit.');
  return {id:f.id,name:f.name,post_ids:[...new Set(f.post_ids)],source_count:new Set(f.post_ids).size,complete:true};
 });
 const editFamilies=body.edit_families||[];
 if(!Array.isArray(editFamilies)||editFamilies.length>100||editFamilies.some(f=>!Array.isArray(f)||f.length>10||!f.length||f.some(id=>!validId(id))))throw Error('Invalid edit history.');
 return {folders,editFamilies,observed_at:body.observed_at,account_handle:body.account_handle.toLowerCase(),complete:true,source:'x_browser'};
}
export function projectBrowserFolders(snapshot,records,excluded=[]){
 const known=new Set(),aliases=new Map(),edits=[];
 for(const row of records){
  const id=row.record?.post_id;if(row.deleted_at||row.record?.kind!=='x_post'||!validId(id)||row.record.fixture)continue;
  known.add(id);const family=new Set([id,...(Array.isArray(row.metadata?.edit_history_tweet_ids)?row.metadata.edit_history_tweet_ids:[]).filter(validId)]);
  for(const incoming of snapshot.editFamilies)if(incoming.some(value=>family.has(value)))for(const value of incoming)family.add(value);
  for(const value of family){if(!aliases.has(value))aliases.set(value,new Set());aliases.get(value).add(id);}
  if(family.size>1)edits.push({id:row.id,edit_history_tweet_ids:[...family].slice(0,10)});
 }
 const observed=new Set(snapshot.folders.flatMap(f=>f.post_ids)),excludedSet=new Set(excluded);
 const unmatched=[...observed].filter(id=>!aliases.has(id)&&!excludedSet.has(id));
 return {snapshot:{folders:snapshot.folders.map(f=>({...f,post_ids:[...new Set(f.post_ids.flatMap(id=>[...(aliases.get(id)||[])]))]})),covered_ids:[...known],synced_at:snapshot.observed_at,observed_at:snapshot.observed_at,complete:true,source:'x_browser'},edits,unmatched};
}
