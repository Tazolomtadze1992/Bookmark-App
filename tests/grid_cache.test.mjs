import test from 'node:test';
import assert from 'node:assert/strict';
import {createGridCache} from '../web/grid-cache.js';

function setup(hiddenLimit=40){
 const grid={children:[],moves:0,insertBefore(node,cursor){this.moves++;node.remove();const index=cursor?this.children.indexOf(cursor):this.children.length;assert.ok(index>=0);this.children.splice(index,0,node);}};
 const made=[],disposed=[];
 const cache=createGridCache(grid,item=>item.version||1,item=>{
  const node={id:item.id,hidden:false,playback:17,remove(){const i=grid.children.indexOf(this);if(i>=0)grid.children.splice(i,1);},get nextElementSibling(){return grid.children[grid.children.indexOf(this)+1]||null;}};
  made.push(node);return {node,dispose:()=>disposed.push(item.id)};
 },{hiddenLimit});
 const items=['a','b','c'].map(id=>({id}));
 return {grid,cache,items,made,disposed,visible:()=>grid.children.filter(n=>!n.hidden).map(n=>n.id)};
}
test('filtering and returning to All preserve connected cards, their playback and visible order',()=>{
 const t=setup();t.cache.reconcile(t.items,t.items);const original=[...t.grid.children],moves=t.grid.moves;
 t.cache.reconcile(t.items,[t.items[1]]);assert.deepEqual(t.visible(),['b']);
 assert.equal(t.grid.children[1],original[1]);assert.equal(original[1].playback,17);
 t.cache.reconcile(t.items,t.items);assert.deepEqual(t.grid.children,original);assert.equal(t.grid.moves,moves);
 assert.equal(t.made.length,3);assert.deepEqual(t.disposed,[]);
});
test('new imports insert before retained cards without moving or disposing them',()=>{
 const t=setup();t.cache.reconcile(t.items,t.items);const b=t.grid.children[1],moves=t.grid.moves;
 const next=[{id:'new'},...t.items];t.cache.reconcile(next,next);
 assert.deepEqual(t.visible(),['new','a','b','c']);assert.equal(t.grid.children[2],b);assert.equal(t.grid.moves,moves+1);assert.deepEqual(t.disposed,[]);
});
test('a changed preview replaces only that card and deleted records are disposed',()=>{
 const t=setup();t.cache.reconcile(t.items,t.items);const a=t.grid.children[0];
 const next=[t.items[0],{id:'b',version:2}];t.cache.reconcile(next,next);
 assert.deepEqual(t.visible(),['a','b']);assert.equal(t.grid.children[0],a);assert.deepEqual(t.disposed,['b','c']);assert.equal(t.made.length,4);
});
test('empty selections retain media and restoring a filter recovers the same cards',()=>{
 const t=setup();t.cache.reconcile(t.items,t.items);const original=[...t.grid.children];
 t.cache.reconcile(t.items,[]);assert.deepEqual(t.visible(),[]);assert.equal(t.grid.children.length,3);
 t.cache.reconcile(t.items,[t.items[2]]);assert.equal(t.grid.children[2],original[2]);assert.deepEqual(t.visible(),['c']);
});
test('hidden cache is bounded and visible cards are never evicted',()=>{
 const t=setup(1);t.cache.reconcile(t.items,t.items);const c=t.grid.children[2];
 t.cache.reconcile(t.items,[t.items[2]]);assert.equal(t.grid.children.length,2);assert.equal(t.grid.children.at(-1),c);assert.equal(t.disposed.length,1);
});
test('actual source reordering is reflected, without replacing media',()=>{
 const t=setup();t.cache.reconcile(t.items,t.items);t.cache.reconcile(t.items,[t.items[2],t.items[0],t.items[1]]);
 assert.deepEqual(t.visible(),['c','a','b']);assert.equal(t.made.length,3);assert.deepEqual(t.disposed,[]);
});
