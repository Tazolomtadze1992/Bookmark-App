// Isolated orchestration tests; Chrome and X are mocked here.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup({allowed=true,idleAllowed=true,initialIdle='idle',resume=false,takeover=false,chromeFocused=true,rejected=false,wrong=false,recent=false}={}){
 const state={folderAutoEnabled:true,folderToken:'f'.repeat(64),folderAccount:'owner',...(recent?{folderLastSuccess:Date.now()}: {})},calls=[],removed=[],messages=[];
 const event=()=>({addListener:fn=>messages.push(fn)}),chrome={
  storage:{local:{get:async()=>({...state,...(takeover&&state.folderScanLock?{folderScanLock:{...state.folderScanLock,taken:true}}:{})}),set:async next=>Object.assign(state,next)}},
  permissions:{contains:async access=>access.permissions?idleAllowed:allowed,remove:async()=>{},onRemoved:event()},
  idle:{queryState:async()=>resume&&calls.some(c=>c[0]==='create')?'active':initialIdle,setDetectionInterval(){},onStateChanged:event()},
  windows:{getLastFocused:async()=>({id:99,focused:chromeFocused,state:'normal'}),create:async args=>{calls.push(['create',args]);return {id:88,tabs:[{id:77,windowId:88}]};},get:async id=>({id,focused:true}),update:async(id,args)=>calls.push(['restore',id,args])},
  tabs:{get:async id=>({id,windowId:88,url:'https://x.com/i/history',active:true}),update:async()=>{},remove:async id=>removed.push(id),query:async()=>[],sendMessage:async()=>{},onActivated:event()},
  scripting:{executeScript:async()=>[{result:{account:'owner'}}],unregisterContentScripts:async()=>{},registerContentScripts:async()=>{}},
  runtime:{onMessage:event(),onStartup:event(),onInstalled:event(),getURL:p=>'chrome-extension://fixture/'+p,openOptionsPage:async()=>{}},
  alarms:{create:async()=>{},clear:async()=>{},onAlarm:event()}
 };
 const context=vm.createContext({chrome,CAPTURE_CONFIG:{base:'https://library.example',endpoint:'https://cloud.example/service'},importScripts:()=>{},AutomaticFolders:{domStep(){},scan:async d=>{await d.navigate('/i/history');await d.step('read');if(wrong)throw Error('Sign in to the linked X account.');return {account_handle:'owner',complete:true,render_check:3,observed_at:Date.now()/1000,folders:[],edit_families:[]};},histories:async()=>{}},fetch:async(url,opts)=>{calls.push(['request',url,JSON.parse(opts.body)]);return {ok:!rejected,status:rejected?401:200,json:async()=>rejected?{error:'Expired'}:url.endsWith('/inspect')?{unmatched_ids:[]}:{ok:true}};},Date,URL,AbortSignal,setTimeout:fn=>setTimeout(fn,0),Promise,console});
 vm.runInContext(fs.readFileSync(require.resolve('../extension/folder-background.js'),'utf8'),context);
 return {context,state,calls,removed,messages};
}
test('an idle check uses its own visible window, closes it, and restores the previous Chrome window',async()=>{
 const s=setup();await s.context.automaticFolders();assert.equal(s.calls[0][0],'create');assert.equal(s.calls[0][1].focused,true);
 assert.deepEqual(s.removed,[77]);assert.ok(s.calls.some(c=>c[0]==='request'&&c[1].endsWith('/apply')));assert.ok(s.calls.some(c=>c[0]==='restore'&&c[1]===99));assert.ok(s.state.folderLastSuccess);assert.equal(s.state.folderRunning,false);
});
test('missing X or idle permission means no window and no upload',async()=>{
 for(const options of [{allowed:false},{idleAllowed:false}]){const s=setup(options);await s.context.automaticFolders();assert.equal(s.calls.length,0);}
});
test('active or locked computers and other foreground apps are left alone',async()=>{
 for(const options of [{initialIdle:'active'},{initialIdle:'locked'},{chromeFocused:false}]){const s=setup(options);await s.context.automaticFolders();assert.equal(s.calls.length,0);assert.equal(s.state.folderWaiting,true);}
});
test('taking over the helper window stops the check and preserves the window',async()=>{
 const s=setup({takeover:true});await s.context.automaticFolders();assert.equal(s.removed.length,0);assert.ok(!s.calls.some(c=>c[0]==='request'&&c[1].endsWith('/apply')));assert.equal(s.state.folderWaiting,true);
});
test('resuming work stops the check before upload and cleans up its own window',async()=>{
 const s=setup({resume:true});await s.context.automaticFolders();assert.deepEqual(s.removed,[77]);assert.ok(!s.calls.some(c=>c[0]==='request'&&c[1].endsWith('/apply')));assert.equal(s.state.folderWaiting,true);
});
test('a recent successful check is not repeated every time the computer becomes idle',async()=>{
 const s=setup({recent:true});await s.context.automaticFolders();assert.equal(s.calls.length,0);
});
test('a wrong account cannot upload assignments',async()=>{
 const s=setup({wrong:true});await s.context.automaticFolders();assert.ok(!s.calls.some(c=>c[0]==='request'&&c[1].endsWith('/apply')));assert.match(s.state.folderSyncError,/linked X account/);
});
test('expired capability stops automatic checks instead of repeatedly uploading',async()=>{
 const s=setup({rejected:true});await s.context.automaticFolders();assert.equal(s.state.folderAutoEnabled,false);assert.equal(s.state.folderRunning,false);
});
