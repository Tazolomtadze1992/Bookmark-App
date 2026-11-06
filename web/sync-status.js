export function syncNotice(b,cloudError,now=Date.now()/1000){
 if(cloudError)return 'Sync status unavailable — check your connection';
 if(!b)return 'Connect X to import new bookmarks';
 if(!b.enabled)return b.sync_issue==='auth'?'X sync stopped — reconnect X':b.sync_issue==='credits'?'X sync stopped — X credits needed':b.sync_issue==='review'?'X sync needs attention — open Connections': 'X sync paused — resume in Connections';
 if(b.sync_issue==='budget')return `X sync waiting for monthly allowance · Renews ${new Date(b.budget_reset_at*1000).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`;
 const next=Math.max(b.next_check||0,b.retry_at||0),minutes=Math.max(1,Math.ceil((next-now)/60));
 if(b.sync_issue==='retry')return `X temporarily unavailable · Retrying in ${minutes} min`;
 if(next&&now>next+1200)return 'X sync is overdue — open Connections';
 const last=b.last_check?`Checked ${Math.max(0,Math.floor((now-b.last_check)/60))} min ago`:'Waiting for first check';
 const folderNotice=b.browser_folder_sync_enabled?(b.browser_folder_error?' · Automatic folders need attention':now-(b.browser_folder_last_sync||0)>2700?' · Waiting for Chrome to update folders':''):b.folder_sync_issue==='partial'?' · X folder updates incomplete':b.folder_error?' · Folder updates delayed':'';
 return `${last} · ${next<=now?'Checking shortly':`Next check in ${minutes} min`}${folderNotice}`;
}
