// Conservative reservations, not an X invoice. Do not rely on soft daily billing deduplication.
export class XRequestError extends Error {
 constructor(status, retryAt=0){
  super(status===401||status===403?'Reconnect X to continue.':status===402?'X credits unavailable. Add credits in X, then resume.':status===429?'X is rate limiting requests. Retrying automatically.':`X request failed (${status}).`);
  this.status=status;this.retryAt=retryAt;
 }
}
export function retryTime(headers,now=Date.now()/1000){
 const after=headers.get('retry-after');
 const delay=after===null?0:/^\d+$/.test(after)?now+Number(after):Date.parse(after)/1000;
 const reset=Number(headers.get('x-rate-limit-reset'))||0;
 return Math.min(now+86400,Math.max(now,Number.isFinite(delay)?delay:0,reset));
}
export function failurePatch(error,state,{now=Date.now()/1000,rotating=false}={}){
 const message=error instanceof Error?error.message:'Cloud check failed. Checkpoint preserved.';
 if(message==='Spending allowance reached')return {message,sync_issue:'budget',...(state.budget_mode==='monthly'?{retry_at:state.budget_reset_at}:{enabled:false})};
 // An uncertain refresh may already have rotated the refresh token. Never blindly replay it.
 if(rotating)return {enabled:false,message:'X token refresh was interrupted. Reconnect X to continue.',sync_issue:'auth'};
 if(error instanceof XRequestError&&[401,403,402].includes(error.status))return {enabled:false,message,sync_issue:error.status===402?'credits':'auth'};
 const transient=error instanceof XRequestError&&(error.status===429||error.status>=500)||['TypeError','TimeoutError','AbortError'].includes(error?.name)||/^Could not (read|save)/.test(message);
 if(transient){
  const failures=Math.min((state.consecutive_failures||0)+1,10);
  return {consecutive_failures:failures,retry_at:Math.max(error.retryAt||0,now+Math.min(3600,900*2**(failures-1))),sync_issue:'retry',message:'X check delayed. Retrying automatically; your bookmark checkpoint is preserved.'};
 }
 return {enabled:false,message,sync_issue:'review'};
}
export function bookmarkIds(result){
 const empty=result&&typeof result==='object'&&!Array.isArray(result)&&Object.keys(result).length===0;
 if(!result||result.errors?.length||(!empty&&!Array.isArray(result.data)&&result.meta?.result_count!==0))throw Error('Unexpected X response. Checkpoint preserved.');
 const list=(result.data||[]).map(p=>p.id);
 if(!list.every(id=>typeof id==='string'&&/^\d{1,25}$/.test(id)))throw Error('Invalid X post identifiers.');
 return list;
}
export async function readBookmarkWindow({get,state}){
 const base=`/2/users/${state.user_id}/bookmarks`;
 const head=await get(base+'?max_results=1',5),first=bookmarkIds(head);
 if(first.length>1)throw Error('Unexpected X response. Checkpoint preserved.');
 // Keep all anchors on an idle poll. An empty response is not permission to backfill later.
 if(!first.length||first[0]===state.anchors[0])return {list:[],unchanged:true};
 let list=[],pagination='',used=new Set();
 for(let page=0;page<5;page++){
  const params=new URLSearchParams({max_results:'10'});if(pagination)params.set('pagination_token',pagination);
  const result=await get(base+'?'+params,50);list.push(...bookmarkIds(result));pagination=result.meta?.next_token||'';
  if(list.some(id=>state.anchors.includes(id))||!pagination)break;
  if(typeof pagination!=='string'||used.has(pagination))throw Error('Repeated X page. Checkpoint preserved.');used.add(pagination);
 }
 if(!state.anchors.length&&pagination)throw Error('Incomplete bookmark window. No older posts imported.');
 return {list,unchanged:false};
}
