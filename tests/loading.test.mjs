import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadQueue} from '../web/load-queue.js';
import {readLibraryState,stateFromRows} from '../cloud/library-state.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('preview requests are bounded and visible cards overtake waiting neighbors',async()=>{
 const queue=createLoadQueue({limit:2}),started=[],jobs=[];
 const get=(key,priority)=>{const wait=deferred();jobs.push(wait);return queue.acquire(key,()=>{started.push(key);return wait.promise;},{priority});};
 const a=get('a',1),b=get('b',1),c=get('c',1);await tick();assert.deepEqual(started,['a','b']);
 const d=get('visible',0);jobs[0].resolve('a');await a.promise;await tick();assert.deepEqual(started,['a','b','visible']);assert.equal(queue.active,2);
 jobs[1].resolve('b');jobs[3].resolve('d');await tick();jobs[2].resolve('c');await Promise.all([b.promise,c.promise,d.promise]);
 for(const request of [a,b,c,d])request.release();
});
test('shared media downloads once and releases its blob only after the final consumer',async()=>{
 const queue=createLoadQueue(),wait=deferred();let downloads=0,disposed=0;
 const load=()=>{downloads++;return wait.promise;};
 const a=queue.acquire('same',load,{dispose:()=>disposed++}),b=queue.acquire('same',load);await tick();
 a.release();assert.equal(downloads,1);assert.equal(disposed,0);wait.resolve('blob');await b.promise;await tick();
 assert.equal(disposed,0);b.release();assert.equal(disposed,1);b.release();assert.equal(disposed,1);
});
test('hidden queued requests never start; canceled running work cannot delete a replacement',async()=>{
 const queue=createLoadQueue({limit:1}),wait=deferred();let canceled=false,starts=0;
 const old=queue.acquire('first',signal=>{signal.addEventListener('abort',()=>{canceled=true;wait.reject(signal.reason);});return wait.promise;});old.promise.catch(()=>{});
 const hidden=queue.acquire('hidden',()=>{starts++;});hidden.promise.catch(()=>{});hidden.release();await tick();assert.equal(starts,0);
 old.release();const replacement=queue.acquire('first',()=>{starts++;return 'replacement';});
 assert.equal(await replacement.promise,'replacement');await tick();
 const shared=queue.acquire('first',()=>{throw Error('Should reuse replacement');});assert.equal(await shared.promise,'replacement');
 assert.equal(canceled,true);assert.equal(starts,1);replacement.release();shared.release();
});
test('a failed thumbnail frees a slot for the next preview and can be retried',async()=>{
 const queue=createLoadQueue({limit:1});const failed=queue.acquire('broken',()=>Promise.reject(Error('offline')));
 const next=queue.acquire('next',()=>42);await assert.rejects(failed.promise,/offline/);assert.equal(await next.promise,42);await tick();
 const retry=queue.acquire('broken',()=>43);assert.equal(await retry.promise,43);failed.release();next.release();retry.release();
});
const row=i=>({id:String(i),record:{kind:i%2?'website':'x_post',url:`https://example.com/${i}`,post_id:String(i)},poster:'https://pbs.twimg.com/media/a.jpg',metadata:{author_name:'Saved author',media:[{width:100,height:80,poster:'https://bad.test/file.jpg'}]}});
test('first references arrive before later pages; all records remain searchable after completion',async()=>{
 const rows=Array.from({length:9},(_,i)=>row(i)),calls=[],snapshots=[];
 const state=await readLibraryState(async(offset,size)=>{calls.push([offset,size]);return rows.slice(offset,offset+size);},{firstPageSize:2,pageSize:4,onProgress:s=>snapshots.push(s)});
 assert.deepEqual(calls,[[0,2],[2,4],[6,4]]);assert.deepEqual(snapshots.map(s=>s.captures.length),[2,6]);
 assert.ok(snapshots.every(s=>s._loading));assert.equal(state.captures.length,9);assert.equal(state._loading,undefined);
 assert.equal(snapshots[0].captures.length,2,'later pages cannot mutate an already displayed snapshot');
 assert.equal(state.x_metadata['8'].author_name,'Saved author');
});
test('partial page failure stays a failure instead of presenting an incomplete library as complete',async()=>{
 let progress;
 await assert.rejects(readLibraryState(async(offset)=>{if(offset)throw Error('offline');return [row(1),row(2)];},{firstPageSize:2,onProgress:s=>{progress=s;}}),/offline/);
 assert.equal(progress._loading,true);assert.equal(progress.captures.length,2);
});
test('empty libraries finish without skeletons and paginated media retains URL validation',async()=>{
 assert.equal((await readLibraryState(async()=>[])).captures.length,0);
 const state=stateFromRows([row(2),row(2),{id:'bad',record:{kind:'website',url:'javascript:alert(1)'}}]);
 assert.equal(state.captures.length,1);assert.match(state.x_images['2'],/^https:\/\/pbs.twimg.com/);assert.equal(state.x_metadata['2'].media[0].poster,null);
});
