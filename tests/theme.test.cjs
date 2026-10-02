const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const source=readFileSync('web/theme.js','utf8');
function load(saved,dark=false,blocked=false,withToggle=false){
 const events={},dom={},media={},root={dataset:{}};
 const frames=new Map();let frameId=0;
 const requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};
 const cancelAnimationFrame=id=>frames.delete(id);
 const paint=()=>{const current=[...frames.values()];frames.clear();current.forEach(fn=>fn());};
 const buttons=['system','light','dark'].map(value=>({dataset:{themeChoice:value},pressed:'false',setAttribute(k,v){this.pressed=v;},addEventListener(k,fn){this.click=fn;}}));
 const orbit={style:{},moving:false,getAnimations(){return this.moving?[{playState:'running'}]:[];}},bodies=[{style:{}},{style:{}}];
 const toggle={dataset:{themeChoice:'dark',themeToggle:''},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this.click=fn;},querySelector:()=>orbit,querySelectorAll:()=>bodies};
 if(withToggle)buttons.push(toggle);
 const select={get value(){return buttons.find(b=>b.pressed==='true')?.dataset.themeChoice;}};
 const storage={value:saved,getItem(){if(blocked)throw Error('blocked');return this.value;},setItem(k,v){if(blocked)throw Error('blocked');this.value=v;}};
 const system={matches:dark,addEventListener:(k,fn)=>media[k]=fn};
 const document={documentElement:root,querySelectorAll:()=>buttons,addEventListener:(k,fn)=>dom[k]=fn};
 const context={document,matchMedia:()=>system,localStorage:storage,addEventListener:(k,fn)=>events[k]=fn,requestAnimationFrame,cancelAnimationFrame};
 runInNewContext(source,context);
 dom.DOMContentLoaded();dom.change=event=>buttons.find(b=>b.dataset.themeChoice===event.target.value).click();return{events,dom,select,root,storage,system,media,toggle,orbit,bodies,paint,frames,api:context.libraryTheme};
}
test('header and shortcut theme API share persistence, labels and instant keyboard motion',()=>{
 const t=load('light',false,false,true);
 t.api.toggle({animate:true});assert.equal(t.storage.value,'dark');assert.equal(t.toggle['aria-label'],'Switch to light mode');assert.equal(t.toggle.dataset.themeMotion,'orbit');
 t.api.toggle();assert.equal(t.storage.value,'light');assert.equal(t.toggle.dataset.themeMotion,'instant');assert.equal(t.toggle['aria-label'],'Switch to dark mode');
 t.api.refresh();assert.equal(t.root.dataset.theme,'light');
});
test('system default follows OS changes, explicit choice persists and resists OS changes',()=>{
 const t=load(null,true);assert.equal(t.root.dataset.theme,'dark');assert.equal(t.select.value,'system');
 t.system.matches=false;t.media.change();assert.equal(t.root.dataset.theme,'light');
 t.dom.change({target:{value:'dark'}});assert.equal(t.storage.value,'dark');t.media.change();assert.equal(t.root.dataset.theme,'dark');
 assert.equal(load(t.storage.value).root.dataset.theme,'dark');
});
test('cross-tab selection and storage reset update both theme and control',()=>{
 const t=load('dark');t.events.storage({key:'reference-library-theme',newValue:'light'});assert.equal(t.root.dataset.theme,'light');assert.equal(t.select.value,'light');
 t.system.matches=true;t.events.storage({key:null,newValue:null});assert.equal(t.select.value,'system');assert.equal(t.root.dataset.theme,'dark');
});
test('invalid or unavailable storage does not break theme switching',()=>{
 assert.equal(load('unexpected').select.value,'system');const t=load(null,false,true);t.dom.change({target:{value:'dark'}});assert.equal(t.root.dataset.theme,'dark');
});
test('theme icons initialize quietly and orbit clockwise after settled toggles',()=>{
 const t=load('light',false,false,true);assert.equal(t.orbit.style.transform,'rotate(0deg)');assert.equal(t.toggle.dataset.themeMotion,'instant');
 t.toggle.click({detail:1});assert.equal(t.orbit.style.transform,'rotate(180deg)');assert.equal(t.toggle.dataset.themeMotion,'orbit');assert.equal(t.toggle['aria-label'],'Switch to light mode');
 assert.equal(t.bodies[0].style.transform,'rotate(-180deg)');
 t.toggle.click({detail:1});assert.equal(t.orbit.style.transform,'rotate(360deg)');assert.equal(t.toggle['aria-label'],'Switch to dark mode');
 assert.equal(load('dark',false,false,true).orbit.style.transform,'rotate(180deg)');
});
test('rapid theme reversals retrace the current arc and keyboard changes stay instant',()=>{
 const t=load('light',false,false,true);t.toggle.click({detail:1});t.orbit.moving=true;t.toggle.click({detail:1});
 assert.equal(t.orbit.style.transform,'rotate(0deg)');t.toggle.click({detail:1});assert.equal(t.orbit.style.transform,'rotate(180deg)');
 t.toggle.click({detail:0});assert.equal(t.toggle.dataset.themeMotion,'instant');assert.equal(t.root.dataset.theme,'light');
});
test('theme colors commit immediately for pointer, keyboard, system and cross-tab changes; hover fades always recover',()=>{
 for(const change of [
  t=>t.toggle.click({detail:1}),
  t=>t.toggle.click({detail:0}),
  t=>t.events.storage({key:'reference-library-theme',newValue:'dark'}),
  t=>{t.events.storage({key:null,newValue:null});t.system.matches=true;t.media.change();}
 ]){
  const t=load('light',false,false,true);
  assert.equal('themeChanging' in t.root.dataset,false);assert.equal(t.frames.size,0);
  change(t);assert.equal(t.root.dataset.theme,'dark');assert.equal('themeChanging' in t.root.dataset,true);
  t.paint();assert.equal('themeChanging' in t.root.dataset,true);
  t.paint();assert.equal('themeChanging' in t.root.dataset,false);assert.equal(t.frames.size,0);
 }
});
test('rapid theme changes cannot let stale cleanup release the latest color commit early',()=>{
 const t=load('light',false,false,true);
 t.toggle.click({detail:1});t.paint();t.toggle.click({detail:1});
 assert.equal(t.root.dataset.theme,'light');assert.equal(t.frames.size,1);
 t.paint();assert.equal('themeChanging' in t.root.dataset,true);
 t.paint();assert.equal('themeChanging' in t.root.dataset,false);assert.equal(t.frames.size,0);
});
