import test from 'node:test';
import assert from 'node:assert/strict';
import {createCollectionScroll} from '../web/collection-scroll.js';

function setup(){
 let top=0,max=9000;
 const heights={x_post:9000,website:1200},events=[];
 const scroll=createCollectionScroll('x_post',{read:()=>top,restore:value=>{events.push(['restore',value]);top=Math.min(value,max);}});
 return {events,get top(){return top;},set top(value){top=value;},change(next){scroll.change(next,()=>{events.push(['render',next]);max=heights[next];top=Math.min(top,max);});}};
}
test('first website visit starts at the top even after deeply scrolling bookmarks',()=>{
 const t=setup();t.top=7000;t.change('website');
 assert.equal(t.top,0);assert.deepEqual(t.events,[['render','website'],['restore',0]]);
 t.change('x_post');assert.equal(t.top,7000,'save before the shorter grid clamps the old position');
});
test('both collections remember their own position over repeated round trips',()=>{
 const t=setup();t.top=3400;t.change('website');t.top=550;t.change('x_post');
 assert.equal(t.top,3400);t.top=4600;t.change('website');assert.equal(t.top,550);
 t.top=0;t.change('x_post');assert.equal(t.top,4600);t.change('website');assert.equal(t.top,0);
});
test('rapid switches and duplicate selections cannot overwrite a saved position',()=>{
 const t=setup();t.top=3200;t.change('website');t.top=700;
 for(let i=0;i<25;i++){t.change('x_post');t.change('x_post');assert.equal(t.top,3200);t.change('website');assert.equal(t.top,700);}
 assert.equal(t.events.length,102,'duplicate selection does not render or scroll');
});
