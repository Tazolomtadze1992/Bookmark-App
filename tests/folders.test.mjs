import test from 'node:test';
import assert from 'node:assert/strict';
import {readFolderSnapshot,updateFolders,folderSyncDue} from '../supabase/functions/library-service/folders.js';
import {folderOptions,inFolder,toggleFolder,validFolderSelection} from '../web/folders.js';
const page = (data,next) => ({data,meta:next?{next_token:next}:{}});
const folder = (id,name) => ({id,name});
const post = id => ({id});
function transport(pages){let i=0;const calls=[];return {calls,get:async(path,units)=>{calls.push({path,units});assert.equal(units,50);assert.ok(i<pages.length,'unexpected request');const value=pages[i++];if(value instanceof Error)throw value;return value;}};}
test('all folder and membership pages are read; only already-saved post IDs persist',async()=>{
 const io=transport([page([folder('1','Motion')],'folders-2'),page([folder('2','UI')]),page([post('10'),post('900')],'posts-2'),page([post('11')]),page([post('11')])]);
 const s=await readFolderSnapshot({...io,userId:'99',knownIds:['10','11','12'],now:()=>123000});
 assert.deepEqual(s.folders,[{id:'1',name:'Motion',post_ids:['10','11']},{id:'2',name:'UI',post_ids:['11']}]);
 assert.equal(s.synced_at,123);assert.equal(io.calls[1].path,'/2/users/99/bookmarks/folders?max_results=10&pagination_token=folders-2');
 assert.equal(io.calls[3].path,'/2/users/99/bookmarks/folders/1?max_results=10&pagination_token=posts-2');
 assert.equal(inFolder({post_id:'900'},'1',s),false); // historical/unsaved IDs cannot enter the library
 assert.equal(inFolder({post_id:'11'},'2',s),true);
 assert.equal(inFolder({post_id:'12'},'unfiled',s),true);
 assert.equal(inFolder({post_id:'13'},'unfiled',s),false); // not checked yet
});
test('rename, move, membership removal, and deleted folder replace the complete snapshot',async()=>{
 const previous={folders:[{id:'1',name:'Old name',post_ids:['10']},{id:'2',name:'Removed',post_ids:['11']}],covered_ids:['10','11'],synced_at:1};
 const io=transport([page([folder('1','Design-eng')]),page([post('11')])]);
 const patch=await updateFolders({state:{user_id:'99',folder_snapshot:previous},knownIds:['10','11'],...io,now:()=>4000000});
 assert.deepEqual(patch.folder_snapshot.folders,[{id:'1',name:'Design-eng',post_ids:['11']}]);
 assert.equal(inFolder({post_id:'10'},'unfiled',patch.folder_snapshot),true);
 assert.equal(previous.folders.length,2);
});
test('empty successful list clears deleted folders; empty folder remains selectable',async()=>{
 const empty=await readFolderSnapshot({...transport([{}]),userId:'99',knownIds:[]});assert.deepEqual(empty.folders,[]);
 const s=await readFolderSnapshot({...transport([page([folder('1','UI')]),{meta:{result_count:0}}]),userId:'99',knownIds:['10']});
 assert.equal(folderOptions(s).length,1);assert.deepEqual(s.folders[0].post_ids,[]);
});
test('failed/partial/error responses keep previous snapshot and do not change bookmark checkpoints',async()=>{
 for(const failure of [Error('Spending allowance reached'),Error('X request failed (403).'),{errors:[{detail:'partial'}],data:[]},{unexpected:true},{data:{},meta:{result_count:0}},{data:[{id:'invalid'}]}]){
  const previous={folders:[{id:'1',name:'Motion',post_ids:['10']}],synced_at:1};
  const patch=await updateFolders({state:{user_id:'99',folder_snapshot:previous},knownIds:['10'],...transport([page([folder('1','Motion')]),failure]),now:()=>4000000});
  assert.ok(patch.folder_error);assert.equal(patch.folder_snapshot,undefined);assert.equal(patch.anchors,undefined);assert.equal(patch.seen_ids,undefined);assert.equal(patch.enabled,undefined);
  assert.equal(previous.folders[0].post_ids[0],'10');
 }
});
test('repeated page tokens, duplicate IDs, oversized responses and scan limits fail closed',async()=>{
 for(const pages of [[page([folder('1','M')],'repeat'),page([folder('2','N')],'repeat')],[page([folder('1','M')],'next'),page([folder('1','M')])],[page(Array.from({length:11},(_,i)=>folder(String(i),'M')))]])await assert.rejects(readFolderSnapshot({...transport(pages),userId:'99',knownIds:[]}));
 await assert.rejects(readFolderSnapshot({...transport([page([folder('1','M')])]),userId:'99',knownIds:[],maxRequests:1}),/limit/);
 let clock=0;await assert.rejects(readFolderSnapshot({...transport([]),userId:'99',knownIds:[],now:()=>clock+=50000}),/limit/);
});
test('automatic folder reads are daily; explicit sync/new bookmarks can force a refresh',async()=>{
 assert.equal(folderSyncDue({folder_last_attempt:100},false,86499),false);assert.equal(folderSyncDue({folder_last_attempt:100},false,86500),true);assert.equal(folderSyncDue({folder_last_attempt:100},true,101),true);
 const patch=await updateFolders({state:{folder_last_attempt:3999},knownIds:[],get:()=>{throw Error('should not request');},now:()=>4000000});assert.deepEqual(patch,{});
});
test('filters handle multi-folder membership, source names literally, and all/unknown options',()=>{
 const s={folders:[{id:'1',name:'<script>UI</script>',post_ids:['10']},{id:'2',name:'Motion',post_ids:['10']}],covered_ids:['10','11'],synced_at:1};
 assert.equal(folderOptions(s)[0].name,'<script>UI</script>');assert.ok(inFolder({post_id:'10'},'1',s));assert.ok(inFolder({post_id:'10'},'2',s));assert.ok(inFolder({},'all',null));assert.equal(inFolder({post_id:'10'},'unfiled',s),false);assert.equal(inFolder({post_id:'10'},'3',s),false);
});

test('multiple selected folders form a union, including Unfiled, without duplicate cards',()=>{
 const snapshot={folders:[{id:'1',name:'Motion',post_ids:['10','11']},{id:'2',name:'UI',post_ids:['11','12']},{id:'3',name:'Static',post_ids:['13']}],covered_ids:['10','11','12','13','14'],synced_at:1};
 const items=['10','11','12','13','14','15'].map(post_id=>({post_id}));
 const result=selection=>items.filter(item=>inFolder(item,selection,snapshot)).map(item=>item.post_id);
 assert.deepEqual(result([]),['10','11','12','13','14','15']);
 assert.deepEqual(result(['1','2']),['10','11','12']);
 assert.deepEqual(result(['1','2','3']),['10','11','12','13']);
 assert.deepEqual(result(['1','unfiled']),['10','11','14']);
 assert.deepEqual(toggleFolder(['1','2'],'all'),[]);
 assert.deepEqual(toggleFolder(['1'],'1'),[]);
 assert.deepEqual(toggleFolder(['1'],'2'),['1','2']);
 assert.deepEqual(toggleFolder(['1','2'],'1'),['2']);
 assert.deepEqual(validFolderSelection(['1','2','gone'],snapshot),['1','2']);
 assert.deepEqual(validFolderSelection(['gone'],snapshot),[]);
 assert.deepEqual(validFolderSelection(['unfiled'],null),[]);
});
