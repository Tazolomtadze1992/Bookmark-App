import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForImages,waitForFont} from '../web/asset-readiness.js';

class ImageStub extends EventTarget{
 constructor({complete=false,decode=()=>Promise.resolve()}={}){super();this.complete=complete;this.decode=decode;this.listeners=new Set();}
 addEventListener(type,callback,options){this.listeners.add(callback);super.addEventListener(type,callback,options);}
 removeEventListener(type,callback){this.listeners.delete(callback);super.removeEventListener(type,callback);}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('a header group waits for both icon loading and decoding',async()=>{
 let decode;const pending=new Promise(resolve=>{decode=resolve;});
 const cached=new ImageStub({complete:true}),late=new ImageStub({decode:()=>pending});let ready=false;
 const gate=waitForImages([cached,late]).then(()=>{ready=true;});await tick();assert.equal(ready,false);
 late.dispatchEvent(new Event('load'));await tick();assert.equal(ready,false,'loaded pixels must also be decoded');
 decode();await gate;assert.equal(ready,true);assert.equal(late.listeners.size,0);
});
test('cached icons and an empty group finish without waiting for a load event',async()=>{
 await waitForImages([new ImageStub({complete:true})]);await waitForImages([]);
});
test('an unavailable icon cannot leave the header permanently disabled',async()=>{
 const broken=new ImageStub(),decodeFailure=new ImageStub({complete:true,decode:()=>Promise.reject(Error('decode'))});
 const gate=waitForImages([broken,decodeFailure]);broken.dispatchEvent(new Event('error'));await gate;
 assert.equal(broken.listeners.size,0);assert.equal(decodeFailure.listeners.size,0);
});
test('a stalled icon times out and removes its listeners',async()=>{
 const stalled=new ImageStub();await waitForImages([stalled],{timeoutMs:20});assert.equal(stalled.listeners.size,0);
});
test('the header waits for its final font metrics before revealing text',async()=>{
 let finish;const loading=new Promise(resolve=>{finish=resolve;});let ready=false;
 const gate=waitForFont({load:spec=>{assert.equal(spec,'500 13px Inter');return loading;}}).then(()=>{ready=true;});
 await tick();assert.equal(ready,false);finish();await gate;assert.equal(ready,true);
});
test('font failures and unavailable font APIs leave controls usable',async()=>{
 await waitForFont(undefined);
 await waitForFont({load:()=>Promise.reject(Error('offline'))});
 await waitForFont({load:()=>new Promise(()=>{})},{timeoutMs:20});
});
