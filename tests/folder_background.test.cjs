// Isolated orchestration tests; Chrome and X are mocked here.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup({allowed=true,active=false,rejected=false,wrong=false}={}){
 let state={folderAutoEnabled:true,folderToken:'f'.repeat(64),folderAccount:'owner'};const calls=[],removed=[],messages=[];
 const event=()=>({addListener:fn=>messages.push(fn)}),chrome={
  storage:{local:{get:async()=>({...state}),set:async next=>Object.assign(state,next)}},
  permissions:{contains:async()=>allowed,remove:async()=>{},onRemoved:event()},
  windows:{create:async args=>{calls.push(['create',args]);return {id:88,tabs:[{id:77,windowId:88}]};},get:async()=>({id:88,focused:active}),onFocusChanged:event()},
  tabs:{get:async id=>({id,windowId:88,url:'https://x.com/i/history',active:true}),update:async()=>{},remove:async id=>removed.push(id),query:async()=>[],sendMessage:async()=>{},onActivated:event()},
  scripting:{executeScript:async()=>[{result:{account:'owner'}}],unregisterContentScripts:async()=>{},registerContentScripts:async()=>{}},
  runtime:{onMessage:event(),onStartup:event(),onInstalled:event(),getURL:p=>'chrome-extension://fixture/'+p,openOptionsPage:async()=>{}},
  alarms:{create:async()=>{},clear:async()=>{},onAlarm:event()}
 };
 const context=vm.createContext({chrome,CAPTURE_CONFIG:{base:'https://library.example',endpoint:'https://cloud.example/service'},importScripts:()=>{},AutomaticFolders:{domStep(){},scan:async d=>{await d.navigate('/i/history');await d.step('read');if(wrong)throw Error('Sign in to the linked X account.');return {account_handle:'owner',complete:true,observed_at:Date.now()/1000,folders:[],edit_families:[]};},histories:async()=>{}},fetch:async(url,opts)=>{calls.push(['request',url,JSON.parse(opts.body)]);return {ok:!rejected,status:rejected?401:200,json:async()=>rejected?{error:'Expired'}:url.endsWith('/inspect')?{unmatched_ids:[]}:{ok:true}};},Date,URL,AbortSignal,setTimeout,Promise,console});
 vm.runInContext(fs.readFileSync(require.resolve('../extension/folder-background.js'),'utf8'),context);
 return {context,state,calls,removed,messages};
}
test('automatic sync uses a separate unfocused X window and closes only that tab',async()=>{
 const s=setup();await s.context.automaticFolders();assert.equal(s.calls[0][0],'create');assert.equal(s.calls[0][1].focused,false);
 assert.deepEqual(s.removed,[77]);assert.ok(s.calls.some(c=>c[0]==='request'&&c[1].endsWith('/apply')));assert.ok(s.state.folderLastSuccess);assert.equal(s.state.folderRunning,false);
});
test('no permission means no X tab and no upload',async()=>{
 const s=setup({allowed:false});await s.context.automaticFolders();assert.equal(s.calls.length,0);
});
test('a user focusing the scan window stops the check and preserves their tab',async()=>{
 const s=setup({active:true});await s.context.automaticFolders();assert.equal(s.removed.length,0);assert.ok(!s.calls.some(c=>c[0]==='request'&&c[1].endsWith('/apply')));assert.match(s.state.folderSyncError,/paused/);
});
test('a wrong account cannot upload assignments',async()=>{
 const s=setup({wrong:true});await s.context.automaticFolders();assert.ok(!s.calls.some(c=>c[0]==='request'&&c[1].endsWith('/apply')));assert.match(s.state.folderSyncError,/linked X account/);
});
test('expired capability stops automatic checks instead of repeatedly uploading',async()=>{
 const s=setup({rejected:true});await s.context.automaticFolders();assert.equal(s.state.folderAutoEnabled,false);assert.equal(s.state.folderRunning,false);
});
