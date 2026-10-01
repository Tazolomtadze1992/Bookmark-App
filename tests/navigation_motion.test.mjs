import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationMotion} from '../web/navigation-motion.js';

test('pointer, keyboard and rapid filter changes render immediately without blanking or locking results',async()=>{
 const renders=[],attributes=new Map([['aria-busy','true']]);let selection='All';
 const grid={inert:true,removeAttribute:k=>attributes.delete(k),animate(){throw Error('Filtering must never fade the grid');}};
 const motion=createNavigationMotion(grid,()=>renders.push(selection));
 const first=motion.update();assert.deepEqual(renders,['All']);assert.equal(grid.inert,false);
 selection='Motion';const next=motion.update();selection='Static';const last=motion.update({animate:false});
 assert.deepEqual(renders,['All','Motion','Static']);await Promise.all([first,next,last]);
 assert.equal(attributes.size,0);
});
test('render errors remain visible to callers without leaving the grid locked',async()=>{
 const grid={inert:true,removeAttribute(){}};
 const motion=createNavigationMotion(grid,()=>{throw Error('Render failure');});
 await assert.rejects(motion.update(),/Render failure/);assert.equal(grid.inert,false);
});

test('layout preview captures before render, renders immediately, then animates; keyboard and reduced motion stay instant',async()=>{
 const calls=[],grid={inert:false,removeAttribute(){}},layout={capture(){calls.push('capture');return 'poses';},stop(){calls.push('stop');},play(p){calls.push(`play:${p}`);}};
 let reduced=false;
 const motion=createNavigationMotion(grid,()=>calls.push('render'),{layoutEnabled:()=>true,reducedMotion:()=>reduced,layout});
 await motion.update();assert.deepEqual(calls,['capture','stop','render','play:poses']);
 calls.length=0;await motion.update({animate:false});assert.deepEqual(calls,['stop','render']);
 calls.length=0;reduced=true;await motion.update();assert.deepEqual(calls,['stop','render']);
 calls.length=0;reduced=false;await motion.update({direction:1});assert.deepEqual(calls,['stop','render']);
});
