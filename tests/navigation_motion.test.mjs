import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationMotion} from '../web/navigation-motion.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(reduced=false){
 const animations=[],attributes=new Map(),renders=[];
 let selection='All';
 const grid={inert:false,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),animate(frames,options){
  let resolve,reject;
  const animation={frames,options,finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),finish:()=>resolve(),cancel:()=>reject(Object.assign(new Error('Cancelled'),{name:'AbortError'}))};
  animations.push(animation);return animation;
 }};
 const motion=createNavigationMotion(grid,()=>renders.push(selection),{reducedMotion:()=>reduced,readPose:()=>({opacity:'.6',transform:'none'})});
 return {motion,grid,animations,attributes,renders,select:value=>{selection=value;}};
}
test('rapid changes render only the latest intent and unlock the grid',async()=>{
 const t=setup();t.select('Motion');const first=t.motion.update();
 t.select('UI');const last=t.motion.update();
 assert.equal(t.grid.inert,true);assert.equal(t.animations[1].frames[0].opacity,'.6');
 t.animations[1].finish();await tick();assert.deepEqual(t.renders,['UI']);
 assert.equal(t.grid.inert,false);t.animations[2].finish();await Promise.all([first,last]);
 assert.equal(t.attributes.has('aria-busy'),false);
});
test('keyboard changes interrupt pending pointer motion and render immediately',async()=>{
 const t=setup();const pending=t.motion.update();t.select('Websites');await t.motion.update({animate:false});await pending;
 assert.deepEqual(t.renders,['Websites']);assert.equal(t.animations.length,1);assert.equal(t.grid.inert,false);assert.equal(t.attributes.size,0);
});
test('reduced motion keeps the fade and removes positional movement',async()=>{
 const t=setup(true);const pending=t.motion.update({direction:1});t.animations[0].finish();await tick();
 assert.equal(t.animations[1].frames[0].transform,'none');assert.equal(t.animations[1].options.duration,100);
 t.animations[1].finish();await pending;
});
test('a selection during entrance retargets without an obsolete completion clearing it',async()=>{
 const t=setup();const first=t.motion.update();t.animations[0].finish();await tick();
 t.select('Static');const last=t.motion.update();await first;
 assert.equal(t.grid.inert,true);assert.equal(t.attributes.get('aria-busy'),'true');
 t.animations[2].finish();await tick();t.animations[3].finish();await last;
 assert.deepEqual(t.renders,['All','Static']);assert.equal(t.grid.inert,false);
});
test('animation failures release the grid; unsupported browsers render immediately',async()=>{
 const t=setup();t.grid.animate=()=>{throw Error('Failed');};await assert.rejects(t.motion.update(),/Failed/);
 assert.equal(t.grid.inert,false);assert.equal(t.attributes.size,0);
 t.grid.animate=undefined;await t.motion.update();assert.deepEqual(t.renders,['All']);
});
