import test from 'node:test';
import assert from 'node:assert/strict';
import {createFilterLayout} from '../web/filter-layout.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function card(id,x=0){
 const attributes=new Map();return {dataset:{id},hidden:false,inert:false,style:{},pose:{x,y:0,width:200,height:150,opacity:1},animations:[],getAttribute:k=>attributes.get(k)??null,setAttribute(k,v){attributes.set(k,v);},removeAttribute:k=>attributes.delete(k),animate(frames,options){
  let resolve,reject;const a={frames,options,cancelled:false,finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),cancel(){this.cancelled=true;reject(Error('Cancelled'));},finish:()=>resolve()};this.animations.push(a);return a;
 }};
}
const setup=nodes=>createFilterLayout({children:nodes},{readPose:n=>({...n.pose}),inViewport:()=>true});
test('retained cards translate from previous positions with no disappearance or scale',async()=>{
 const a=card('a',400),layout=setup([a]),before=layout.capture();a.pose.x=0;layout.play(before);
 const animation=a.animations[0];assert.equal(animation.options.duration,240);
 assert.deepEqual(animation.frames,[{transform:'translate(400px, 0px)',opacity:1},{transform:'none',opacity:1}]);
 assert.equal(a.hidden,false);animation.finish();await tick();assert.equal(animation.cancelled,true);
});
test('new cards fade in without motion; unchanged cards have no redundant animation',()=>{
 const a=card('a'),b=card('b',200);b.hidden=true;const layout=setup([a,b]),before=layout.capture();b.hidden=false;layout.play(before);
 assert.equal(a.animations.length,0);assert.equal(b.animations[0].options.duration,120);assert.deepEqual(b.animations[0].frames,[{opacity:0},{opacity:1}]);layout.stop();
});
test('exits leave the grid layout, cannot receive input, then restore the hidden cached card',async()=>{
 const a=card('a',200),layout=setup([a]),before=layout.capture();a.hidden=true;layout.play(before);
 assert.equal(a.style.position,'fixed');assert.equal(a.style.left,'200px');assert.equal(a.inert,true);assert.equal(a.getAttribute('aria-hidden'),'true');assert.equal(a.hidden,false);
 assert.equal(a.animations[0].options.duration,80);a.animations[0].finish();await tick();
 assert.equal(a.hidden,true);assert.equal(a.inert,false);assert.equal(a.getAttribute('data-filter-exit'),null);assert.equal(a.getAttribute('aria-hidden'),null);
});
test('rapid changes capture the CURRENT motion pose and cancel previous work safely',()=>{
 const a=card('a',400),layout=setup([a]);const first=layout.capture();a.pose.x=0;layout.play(first);
 a.pose.x=180;const second=layout.capture();layout.stop();assert.equal(a.animations[0].cancelled,true);
 a.pose.x=400;layout.play(second);assert.equal(a.animations[1].frames[0].transform,'translate(-220px, 0px)');layout.stop();
});
test('interrupting an exit restores cache semantics; removed records are not resurrected',()=>{
 const a=card('a'),nodes=[a],layout=setup(nodes),before=layout.capture();a.hidden=true;layout.play(before);layout.stop();
 assert.equal(a.hidden,true);assert.equal(a.getAttribute('data-filter-exit'),null);assert.equal(a.inert,false);
 nodes.length=0;layout.play(before);assert.equal(a.animations.length,1);
});
