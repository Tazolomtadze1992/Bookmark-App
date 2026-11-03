import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadingTransitions} from '../web/loading-transition.js';

function element(){
 const animations=[];let removed=0;
 return {animations,get removed(){return removed;},remove(){removed++;},animate(frames,options){
  let complete,reject;const finished=new Promise((yes,no)=>{complete=yes;reject=no;});
  const animation={frames,options,finished,complete,canceled:false,cancel(){this.canceled=true;reject(Error('canceled'));}};
  animations.push(animation);return animation;
 }};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('skeleton and content overlap on one clock until both fades finish',async()=>{
 const owner={},skeleton=element(),content=element();
 const transitions=createLoadingTransitions({opacity:()=>.78});
 const finished=transitions.reveal(owner,{skeleton,content:[content]});
 assert.equal(skeleton.removed,0,'never remove the skeleton before the incoming pixels appear');
 assert.deepEqual(skeleton.animations[0].frames,[{opacity:.78},{opacity:0}]);
 assert.deepEqual(content.animations[0].frames,[{opacity:0},{opacity:1}]);
 assert.deepEqual(content.animations[0].options,skeleton.animations[0].options);
 assert.equal(content.animations[0].options.duration,200);
 skeleton.animations[0].complete();await tick();assert.equal(skeleton.removed,0);
 content.animations[0].complete();await finished;assert.equal(skeleton.removed,1);
});
test('rapid changes settle the old layers and stale completions cannot remove the new ones',async()=>{
 const transitions=createLoadingTransitions(),owner={},old=element(),next=element(),content=element();
 const first=transitions.reveal(owner,{skeleton:old,content:[content]});
 const second=transitions.reveal(owner,{skeleton:next,content:[content]});
 await first;await tick();assert.equal(old.removed,1);assert.equal(next.removed,0);
 transitions.settle(owner);await second;assert.equal(next.removed,1);
 transitions.settle(owner);assert.equal(next.removed,1,'cleanup runs exactly once');
});
test('reduced motion and off-screen content finish instantly without allocating animations',async()=>{
 for(const options of [{duration:()=>0},{visible:()=>false}]){
  const skeleton=element(),content=element(),transitions=createLoadingTransitions(options);
  await transitions.reveal({}, {skeleton,content:[content]});
  assert.equal(skeleton.removed,1);assert.equal(skeleton.animations.length,0);assert.equal(content.animations.length,0);
 }
});
test('retained header overlays can be hidden and reused instead of detached',async()=>{
 const transitions=createLoadingTransitions(),owner={},skeleton=element();let hidden=false;
 const finished=transitions.reveal(owner,{skeleton,cleanup:()=>{hidden=true;}});
 assert.equal(hidden,false);skeleton.animations[0].complete();await finished;
 assert.equal(hidden,true);assert.equal(skeleton.removed,0);
});
