const remoteMedia=(value,host)=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password&&(!u.port||u.port==='443')?u.href:null;}catch{return null;}};
export function stateFromRows(rows){
 const state={captures:[],motion:{},x_images:{},x_metadata:{},bookmarks:null},seen=new Set();
 for(const row of rows){
  const item={...row.record,id:row.id};
  if(seen.has(item.id)||!/^https?:\/\//i.test(item.url)||!['website','x_post'].includes(item.kind))continue;
  seen.add(item.id);
  state.captures.push(item);const pid=item.post_id;
  if(pid&&row.motion&&remoteMedia(row.motion.url,'video.twimg.com'))state.motion[pid]=row.motion;
  if(pid&&remoteMedia(row.poster,'pbs.twimg.com'))state.x_images[pid]=row.poster;
  if(pid&&row.metadata)state.x_metadata[pid]={...row.metadata,avatar:remoteMedia(row.metadata.avatar,'pbs.twimg.com')||'',media:(Array.isArray(row.metadata.media)?row.metadata.media:[]).map(m=>({...m,poster:remoteMedia(m.poster,'pbs.twimg.com'),motion:m.motion&&remoteMedia(m.motion.url,'video.twimg.com')?m.motion:null}))};
 }
 return state;
}
export async function readLibraryState(readPage,{onProgress,firstPageSize=80,pageSize=500}={}){
 const rows=[];let offset=0,size=firstPageSize;
 while(true){
  const data=await readPage(offset,size);rows.push(...data);
  if(data.length<size)return stateFromRows(rows);
  onProgress?.({...stateFromRows(rows),_loading:true});
  offset+=data.length;size=pageSize;
 }
}
