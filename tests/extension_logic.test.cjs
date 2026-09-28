// Pure orchestration tests with MOCKED Chrome APIs. Not extension integration.
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../extension/background.js'),'utf8');
function setup({offline=false,switchTab=false,partial=false,missingToken=false,rejected=false}={}){
 let state={};const posts=[],calls=[];let badge='',title='';
 const tab={id:7,windowId:1,url:'https://example.test/reference',title:'Fixture'};
 const chrome={
  storage:{local:{setAccessLevel:async()=>{},get:async k=>structuredClone(state),set:async v=>{state={...state,...structuredClone(v)};calls.push('persist');}}},
  action:{setBadgeText:async x=>{badge=x.text},setTitle:async x=>{title=x.title},onClicked:{addListener:()=>{}}},
  contextMenus:{removeAll:fn=>fn(),create:()=>{},onClicked:{addListener:()=>{}}},
  runtime:{onInstalled:{addListener:()=>{}}},
  scripting:{executeScript:async()=>[{result:{url:tab.url,title:'Fixture',description:'Test only',viewport:{width:100,height:100},warnings:[],skip_preview:partial}}]},
  tabs:{query:async()=>[{...tab,id:switchTab?99:7}],captureVisibleTab:async()=>{calls.push('screenshot');return 'fixture-image';},create:async()=>{}},
 };
 const context=vm.createContext({chrome,importScripts:()=>{},CAPTURE_CONFIG:{base:'http://127.0.0.1:8765',token:missingToken?'':'mock'},URL,crypto:webcrypto,performance,AbortSignal,console:{error:()=>{}},fetch:async(url,options)=>{
   if(offline)throw Error('offline');posts.push(JSON.parse(options.body));return rejected ? {ok:false,status:403,json:async()=>({error:'Capture request not authorised.'})} : {ok:true,json:async()=>({ok:true})};
 }});
 vm.runInContext(source,context);
 // Image conversion is covered separately by rendering fixtures, not by this stub.
 vm.runInContext('preparePreview=async()=>"data:image/jpeg;base64,MOCK_ONLY"',context);
 return {context,tab,posts,calls,state:()=>state,badge:()=>badge,title:()=>title};
}
test('source persisted before screenshot; no mandatory metadata input',async()=>{
 const s=setup();await s.context.saveTab(s.tab);assert.ok(s.calls.indexOf('persist')<s.calls.indexOf('screenshot'));
 assert.equal(s.posts.length,1);assert.equal(s.posts[0].url,s.tab.url);assert.ok(s.posts[0].preview_data_url);assert.equal(s.badge(),'✓');
});
test('offline capture stays queued with preview',async()=>{
 const s=setup({offline:true});await s.context.saveTab(s.tab);assert.equal(s.badge(),'Q');assert.equal(Object.keys(s.state().outbox).length,1);assert.ok(Object.values(s.state().outbox)[0].preview_data_url);
});
test('tab switch prevents capturing the wrong page',async()=>{
 const s=setup({switchTab:true});await s.context.saveTab(s.tab);assert.ok(!s.calls.includes('screenshot'));assert.equal(s.posts[0].preview_data_url,null);assert.equal(s.badge(),'!');
});
test('missing post is source-only, not screenshot success',async()=>{
 const s=setup({partial:true});await s.context.saveTab(s.tab);assert.ok(!s.calls.includes('screenshot'));assert.equal(s.posts[0].preview_data_url,null);assert.equal(s.badge(),'!');
});
test('timeline is rejected before source collection',async()=>{
 const s=setup();await assert.rejects(s.context.saveTab({...s.tab,url:'https://x.com/home'}),/individual X post/);assert.equal(s.posts.length,0);assert.equal(s.calls.length,0);
});
test('unpaired copy reports pairing failure and preserves capture without a request',async()=>{
 const s=setup({missingToken:true});await s.context.saveTab(s.tab);
 assert.equal(s.posts.length,0);assert.equal(s.badge(),'Q');assert.match(s.title(),/not paired/);
 assert.equal(Object.keys(s.state().outbox).length,1);assert.ok(Object.values(s.state().outbox)[0].preview_data_url);
});
test('server rejection is displayed without losing the pending capture',async()=>{
 const s=setup({rejected:true});await s.context.saveTab(s.tab);
 assert.equal(s.badge(),'Q');assert.match(s.title(),/not authorised/);
 assert.equal(Object.keys(s.state().outbox).length,1);
});
test('offline delivery reports its own error and retry preserves the queued item',async()=>{
 const s=setup({offline:true});await s.context.saveTab(s.tab);
 assert.match(s.title(),/Delivery failed: offline/);
 const retry=await s.context.flushQueue();assert.equal(retry.error,'offline');assert.equal(retry.remaining,1);
});
