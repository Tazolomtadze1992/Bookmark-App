export const SCOPES='tweet.read users.read bookmark.read offline.access';
export function newPrefix(ids,anchors,excluded,seen){
 if(new Set(ids).size!==ids.length)throw Error('Overlapping X pages. Checkpoint preserved.');
 const overlap=ids.filter(id=>anchors.includes(id));
 if(anchors.length&&!overlap.length)throw Error('Previous bookmarks were not found. Sync paused to avoid importing older bookmarks.');
 const positions=overlap.map(id=>anchors.indexOf(id));
 if(positions.some((n,i)=>i&&n<positions[i-1]))throw Error('Bookmark order changed. Checkpoint preserved.');
 const end=ids.findIndex(id=>anchors.includes(id));
 return ids.slice(0,end<0?ids.length:end).filter(id=>!excluded.includes(id)&&!seen.includes(id));
}
export function safeMedia(value,host){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}}
export function projectPost(post,includes={}){
 const user=(includes.users||[]).find(u=>u.id===post.author_id)||{};
 const media=(includes.media||[]).find(m=>m.media_key===post.attachments?.media_keys?.[0])||{};
 const variants=(media.variants||[]).filter(v=>v.content_type==='video/mp4'&&safeMedia(v.url,'video.twimg.com')).sort((a,b)=>(a.bit_rate||0)-(b.bit_rate||0));
 const chosen=variants.filter(v=>(v.bit_rate||0)<=12000000).at(-1)||variants[0];
 const dimensions=Number.isInteger(media.width)&&media.width>0&&media.width<20000&&Number.isInteger(media.height)&&media.height>0&&media.height<20000;
 return {motion:chosen&&dimensions?{url:chosen.url,width:media.width,height:media.height,type:media.type,duration_ms:media.duration_ms,provenance:'official_cloud_sync',fetched_at:Date.now()/1000}:null,
  poster:safeMedia(media.preview_image_url||media.url,'pbs.twimg.com'),metadata:{text:String(post.text||'').slice(0,10000),published_at:post.created_at,author_name:String(user.name||'').slice(0,300),author_handle:String(user.username||'').slice(0,100),avatar:safeMedia(user.profile_image_url,'pbs.twimg.com')||''}};
}
export function normalise(value){
 if(typeof value!=='string'||value.length>4096)throw Error('Invalid source URL.');
 const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Invalid source URL.');
 if(/^(www\.|mobile\.)?(x|twitter)\.com$/.test(u.hostname)){
  const match=u.pathname.match(/\/(?:[^/]+\/status|i\/status)\/(\d+)(?:\/|$)/);
  if(!match)throw Error('Open an individual X post before saving.');
  return {url:`https://x.com/i/status/${match[1]}`,post_id:match[1]};
 }
 for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key)||/^(fbclid|gclid)$/i.test(key))u.searchParams.delete(key);
 return {url:u.href,post_id:null};
}
export async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
