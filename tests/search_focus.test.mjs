import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the actual controller's event ordering without a browser or paid data.
const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const start=app.indexOf("const searchControl=$('#search-control')");
const end=app.indexOf('function filteredItems()',start);
assert.ok(start>=0&&end>start,'Search controller source is available');
const source=app.slice(start,end);
function setup(){
 const frames=[],microtasks=[],document={activeElement:{id:'body'},addEventListener(){}};
 function element(id,parent){
  const listeners={};
  return {id,parent,dataset:{},value:'',inert:false,attributes:{},
   addEventListener(type,fn){(listeners[type]??=[]).push(fn);},
   emit(type,event={}){for(const fn of listeners[type]??[])fn(event);},
   setAttribute(name,value){this.attributes[name]=value;},
   contains(node){for(let n=node;n;n=n.parent)if(n===this)return true;return false;},
   focus(){document.activeElement=this;},select(){}};
 }
 const control=element('search-control'),form=element('library-search',control),input=element('search-input',form),clear=element('clear-search',form),trigger=element('search-trigger-button',control),theme=element('theme');
 const nodes={'#search-control':control,'#library-search':form,'#search-input':input,'#clear-search':clear,'#search-results':element('search-results'),'#search-trigger button':trigger};
 const context=vm.createContext({$:selector=>nodes[selector],document,window:{dispatchEvent(){}},CustomEvent:class{},requestAnimationFrame:fn=>frames.push(fn),queueMicrotask:fn=>microtasks.push(fn),renderGrid(){},searchShortcut(){return false;},query:'',dialog:{open:false}});
 vm.runInContext(source,context);
 const flush=()=>{while(microtasks.length)microtasks.shift()();while(frames.length)frames.shift()();};
 vm.runInContext('openSearch({animate:true})',context);
 return {control,form,input,clear,trigger,theme,document,flush};
}
test('moving focus to Close cannot snap the field shut before its pointer click',()=>{
 const t=setup();
 // During blur, activeElement may briefly be body while relatedTarget already
 // identifies the button about to receive focus.
 t.document.activeElement={id:'body'};
 t.form.emit('focusout',{relatedTarget:t.clear});
 t.flush();
 assert.equal(t.control.dataset.open,'true');
 t.document.activeElement=t.clear;
 t.clear.emit('click',{detail:1});
 assert.equal(t.control.dataset.open,'false');
 assert.equal(t.control.dataset.motion,'animated');
 t.flush();assert.equal(t.document.activeElement,t.trigger);
});
test('tabbing away closes an empty field instantly and preserves destination focus',()=>{
 const t=setup();
 t.form.emit('focusout',{relatedTarget:t.theme});
 t.document.activeElement=t.theme;t.flush();
 assert.equal(t.control.dataset.open,'false');
 assert.equal(t.control.dataset.motion,'instant');
 assert.equal(t.document.activeElement,t.theme);
});
test('unknown blur destination is checked after focus settles inside search',()=>{
 const t=setup();
 t.document.activeElement={id:'body'};
 t.form.emit('focusout',{relatedTarget:null});
 t.document.activeElement=t.clear;t.flush();
 assert.equal(t.control.dataset.open,'true');
});
