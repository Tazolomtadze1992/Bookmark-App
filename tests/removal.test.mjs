import test from 'node:test';
import assert from 'node:assert/strict';
import {createRemovalController,restoreReference} from '../web/removal.js';
import {updateReferenceTrash} from '../cloud/trash.js';

const website={id:'a'.repeat(32),kind:'website'},bookmark={id:'b'.repeat(32),kind:'x_post'};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
test('Undo restores original order when neighboring cards are removed and restored in either order',()=>{
 const [a,b,c]=['a','b','c'].map(id=>({id}));
 for(const order of [[a,b],[b,a]]){
  let items=[c];for(const item of order)items=restoreReference(items,item,item===a?['b','c']:['c']);
  assert.deepEqual(items,[a,b,c]);assert.equal(restoreReference(items,b,['c']),items);
 }
 assert.deepEqual(restoreReference([{id:'new'},c],a,['b','c']),[{id:'new'},a,c]);
});
function setup(request){
 const calls=[],removed=[],restored=[],notices=[];
 const controller=createRemovalController({request:async(path,body)=>{calls.push([path,body]);return request?request(path,body):{deletedAt:'2026-10-30T14:00:00Z'};},
  onRemoved:item=>{removed.push(item.id);return {index:3};},onRestored:(item,snapshot)=>restored.push([item.id,snapshot.index]),notify:(message,undo,expire)=>notices.push({message,undo,expire})});
 return {...controller,calls,removed,restored,notices};
}
test('removal is saved before disappearing; repeated clicks send one mutation and one Undo',async()=>{
 const save=deferred(),t=setup(()=>save.promise);
 const first=t.remove(website),second=t.remove(website);
 assert.equal(first,second);assert.equal(t.calls.length,1);assert.deepEqual(t.removed,[]);assert.equal(t.notices.length,0);
 save.resolve({deletedAt:'stamp'});await first;
 assert.deepEqual(t.removed,[website.id]);assert.equal(t.notices[0].message,'Website removed');
 assert.deepEqual(t.calls[0],['/api/trash',{id:website.id}]);
});
test('failed saving leaves the card visible and permits a retry',async()=>{
 let fail=true;const t=setup(()=>{if(fail)throw Error('offline');return {deletedAt:'stamp'};});
 await assert.rejects(t.remove(bookmark),/offline/);assert.deepEqual(t.removed,[]);assert.equal(t.notices.length,0);
 fail=false;await t.remove(bookmark);assert.deepEqual(t.removed,[bookmark.id]);assert.equal(t.notices[0].message,'Bookmark removed');
});
test('independent Undo actions restore their own item and preserve its saved position',async()=>{
 const t=setup();await t.remove(website);await t.remove(bookmark);
 await t.notices[0].undo();assert.deepEqual(t.restored,[[website.id,3]]);
 assert.deepEqual(t.calls[2],['/api/restore',{id:website.id,deletedAt:'2026-10-30T14:00:00Z'}]);
 await t.notices[1].undo();assert.deepEqual(t.restored,[[website.id,3],[bookmark.id,3]]);
});
test('double Undo sends one restore; a failed restore remains retryable',async()=>{
 const restore=deferred();let fail=true;
 const t=setup(path=>path==='/api/trash'?{deletedAt:'stamp'}:fail?restore.promise:{});
 await t.remove(website);const a=t.notices[0].undo(),b=t.notices[0].undo();assert.equal(a,b);
 restore.reject(Error('offline'));await assert.rejects(a,/offline/);assert.deepEqual(t.restored,[]);
 fail=false;await t.notices[0].undo();assert.deepEqual(t.restored,[[website.id,3]]);
});
test('an old or expired Undo cannot restore a newer removal of the same item',async()=>{
 const t=setup();await t.remove(website);const old=t.notices[0];await old.undo();
 await t.remove(website);const count=t.calls.length;await old.undo();assert.equal(t.calls.length,count);
 const current=t.notices[1];current.expire();await current.undo();assert.equal(t.calls.length,count);
});
function database(result={data:{id:website.id,deleted_at:'stamp'},error:null}){
 const calls=[];const query={};for(const method of ['update','eq','select'])query[method]=(...args)=>{calls.push([method,...args]);return query;};
 query.single=async()=>result;
 return {calls,from:table=>{calls.push(['from',table]);return query;}};
}
test('cloud mutation scopes to the owner and verifies that a row was changed',async()=>{
 const db=database();await updateReferenceTrash(db,'owner',{id:website.id});
 assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]==='owner'));
 assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]==='id'&&c[2]===website.id));
 assert.equal(db.calls.find(c=>c[0]==='update')[1].deleted_at.length,24);
 assert.deepEqual(db.calls.at(-1),['select','id,deleted_at']);
});
test('cloud Undo compares its timestamp; invalid IDs, denied rows and conflicts fail safely',async()=>{
 const db=database();await updateReferenceTrash(db,'owner',{id:website.id,deletedAt:'original'},true);
 assert.deepEqual(db.calls.find(c=>c[0]==='update'),['update',{deleted_at:null}]);
 assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]==='deleted_at'&&c[2]==='original'));
 await assert.rejects(updateReferenceTrash(database(),'owner',{id:'bad'}),/Invalid reference/);
 await assert.rejects(updateReferenceTrash(database({data:null,error:null}),'owner',{id:website.id}),/Could not remove/);
 await assert.rejects(updateReferenceTrash(database({data:null,error:{code:'PGRST116'}}),'owner',{id:website.id},true),/Could not restore/);
});
