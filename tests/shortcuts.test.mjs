import test from 'node:test';
import assert from 'node:assert/strict';
import {headerShortcut} from '../web/shortcuts.js';

test('X and W select collections; D toggles theme; unrelated keys pass through',()=>{
 for(const [key,action] of [['x','x_post'],['X','x_post'],['w','website'],['W','website'],['d','theme'],['D','theme'],['Escape',null],['a',null]])assert.equal(headerShortcut({key}),action);
});
test('typing, composition, held keys, browser commands, and open viewers are never intercepted',()=>{
 for(const key of ['x','w','d']){
  for(const flag of ['defaultPrevented','repeat','isComposing','metaKey','ctrlKey','altKey'])assert.equal(headerShortcut({key,[flag]:true}),null);
  assert.equal(headerShortcut({key},{modalOpen:true}),null);
  assert.equal(headerShortcut({key,target:{isContentEditable:true}}),null);
  for(const tag of ['input','textarea','select','textbox','editable-child'])assert.equal(headerShortcut({key,target:{closest:()=>({tag})}}),null);
 }
});
