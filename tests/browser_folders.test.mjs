import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {validateBrowserFolders,projectBrowserFolders} from '../supabase/functions/library-service/browser-folders.js';
const {scan,histories}=createRequire(import.meta.url)('../extension/folder-scanner.js');
const body=()=>({account_handle:'Owner',observed_at:100,complete:true,folders:[{id:'1',name:'Motion',post_ids:['10','20','999'],complete:true}]});
test('wrong accounts, partial scans, stale uploads and invalid IDs cannot replace assignments',()=>{
 for(const change of [{account_handle:'other'},{complete:false},{observed_at:-1000},{folders:[{id:'bad',name:'Motion',post_ids:[],complete:true}]},{folders:[{id:'1',name:'Motion',post_ids:['bad'],complete:true}]}])assert.throws(()=>validateBrowserFolders({...body(),...change},'owner',100));
 assert.equal(validateBrowserFolders(body(),'owner',100).account_handle,'owner');
});
test('browser scans categorize saved cards only, retain multi-folder membership and resolve verified edits',()=>{
 const s=validateBrowserFolders({...body(),edit_families:[['11','20']],folders:[...body().folders,{id:'2',name:'UI',post_ids:['20'],complete:true}]},'owner',100);
 const rows=[{id:'a',record:{kind:'x_post',post_id:'10'}},{id:'b',record:{kind:'x_post',post_id:'11'}},{id:'c',record:{kind:'x_post',post_id:'999'},deleted_at:'deleted'},{id:'d',record:{kind:'website'}}];
 const result=projectBrowserFolders(s,rows,['999']);
 assert.deepEqual(result.snapshot.folders.map(f=>f.post_ids),[['10','11'],['11']]);assert.deepEqual(result.snapshot.covered_ids,['10','11']);
 assert.deepEqual(result.edits,[{id:'b',edit_history_tweet_ids:['11','20']}]);assert.deepEqual(result.unmatched,[]);
});
test('unknown posts are returned only from this upload, never as a collection listing',()=>{
 const result=projectBrowserFolders(validateBrowserFolders(body(),'owner',100),[{id:'a',record:{kind:'x_post',post_id:'10'},metadata:{edit_history_tweet_ids:'bad'}}]);
 assert.deepEqual(result.unmatched,['20','999']);assert.deepEqual(result.snapshot.folders[0].post_ids,['10']);
});
function fakeDriver({wrong=false,stall=false,changed=false,logout=false,empty=false}={}){
 let clock=0,menu=false,current=-1,position=0,reads=0;const names=empty?[]:['Motion','Reading'],count=29;
 const get=()=>({account:wrong?'someone_else':logout&&clock>3000?undefined:'owner',selected:current<0?'Bookmarks':names[current],path:current<0?'/i/history':'/i/history/bookmarks/'+(current+1),menuOpen:menu,menu:menu?(changed&&current===1?['Renamed','Reading']:names):[],loading:stall,empty:current===1,top:position,max:current===0?count-1:0,posts:current===0?Array.from({length:Math.min(5,count-position)},(_,i)=>({id:String(position+i+100),href:'/author/status/'+(position+i+100)})):[]});
 return {now:()=>clock,navigate:async()=>{current=-1;position=0;},pause:async n=>{clock+=n;},step:async(action,args)=>{reads++;if(action==='open')menu=true;if(action==='choose'){current=args.index;menu=false;position=0;}if(action==='scroll')position=Math.min(count-1,position+3);return get();},reads:()=>reads};
}
test('a complete browser traversal handles more than 20 posts, overlap, and empty folders',async()=>{
 const d=fakeDriver(),result=await scan(d,{account:'owner',now:d.now});
 assert.equal(result.folders[0].post_ids.length,29);assert.equal(result.folders[0].post_ids[0],'100');assert.equal(result.folders[0].post_ids.at(-1),'128');
 assert.deepEqual(result.folders[1].post_ids,[]);assert.equal(result.complete,true);
});
test('wrong account, logout, stalled loading and folder changes stop the whole scan',async()=>{
 for(const options of [{wrong:true},{logout:true},{stall:true},{changed:true}]){const d=fakeDriver(options);await assert.rejects(scan(d,{account:'owner',now:d.now}));}
});
test('deleting every folder produces an explicit complete empty list',async()=>{
 const d=fakeDriver({empty:true});const result=await scan(d,{account:'owner',now:d.now});assert.deepEqual(result.folders,[]);
});
test('edit-history verification links versions without changing any X content',async()=>{
 let clock=0;const visited=[];const d={navigate:async path=>visited.push(path),pause:async ms=>{clock+=ms;},step:async()=>({account:'owner',history:true,loading:false,posts:[{id:'20'},{id:'10'}]})};
 const s={account_handle:'owner',refs:{'20':'/author/status/20'},edit_families:[]};await histories(d,s,['20'],{now:()=>clock});
 assert.deepEqual(visited,['/author/status/20/history']);assert.deepEqual(s.edit_families,[['20','10']]);
});
