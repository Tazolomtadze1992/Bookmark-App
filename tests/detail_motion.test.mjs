import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cardViewportClip} from '../web/detail-motion.js';

const stage={top:80,left:0,right:1440,bottom:736};
const viewport={top:72,left:0,right:1440,bottom:800};
test('partially covered thumbnails begin at the visible navigation edge and end at the viewport edge',()=>{
  const clip=cardViewportClip({top:-174,bottom:168},stage,viewport);
  assert.deepEqual(clip,{covered:'inset(-8px 0px -64px 0px)',clear:'inset(-80px 0px -64px 0px)'});
  // The stage is already below the nav. Its negative inset preserves the
  // correct screen-space boundary, rather than clipping the enlarged asset.
  assert.equal(stage.top+parseFloat(clip.covered.slice(6)),viewport.top);
});
test('fully visible thumbnails keep their existing unmasked transition',()=>{
  assert.equal(cardViewportClip({top:96,bottom:400},stage,viewport),null);
  assert.equal(cardViewportClip({top:72,bottom:400},stage,viewport),null);
});
test('fully hidden and offscreen sources do not produce a false visible origin',()=>{
  assert.equal(cardViewportClip({top:-300,bottom:50},stage,viewport),null);
  assert.equal(cardViewportClip({top:900,bottom:1200},stage,viewport),null);
  assert.equal(cardViewportClip(null,stage,viewport),null);
});
test('wrapped mobile navigation uses its measured boundary rather than a desktop height',()=>{
  const mobileStage={top:68,left:0,right:390,bottom:780};
  const clip=cardViewportClip({top:30,bottom:280},mobileStage,{top:112,left:0,right:390,bottom:844});
  assert.deepEqual(clip,{covered:'inset(44px 0px -64px 0px)',clear:'inset(-68px 0px -64px 0px)'});
});
