import test from 'node:test';
import assert from 'node:assert/strict';
import {createThemeIconMotion} from '../ui/theme-icon-motion.js';

class Element{
 constructor(className='',ownerDocument){this.className=className;this.ownerDocument=ownerDocument;this.children=[];this.dataset={};this.style={};}
 append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}}
 replaceChildren(...nodes){for(const node of [...this.children])node.remove();this.append(...nodes);}
 querySelector(selector){for(const node of this.children){if(node.className.split(' ').includes(selector.slice(1)))return node;const found=node.querySelector(selector);if(found)return found;}return null;}
 cloneNode(){const copy=new Element(this.className,this.ownerDocument);Object.assign(copy.style,this.style);for(const child of this.children)copy.append(child.cloneNode());return copy;}
}
function setup(){
 const doc={createElement:()=>new Element('',doc)},button=new Element('',doc),viewport=new Element('theme-viewport',doc),oldOrbit=new Element('theme-orbit',doc);
 oldOrbit.append(new Element('theme-body theme-sun',doc),new Element('theme-body theme-moon',doc));viewport.append(oldOrbit);button.append(viewport);
 const animations=[];let reduced=false;
 const animate=(node,target,options)=>{
  let finish;const controls=new Promise(resolve=>{finish=()=>{Object.assign(node.style,target);resolve();};});
  controls.stop=()=>{controls.stopped=true;};controls.complete=finish;
  animations.push({node,target,options,controls,from:{...node.style}});return controls;
 };
 const controller=createThemeIconMotion(button,{animate,reducedMotion:()=>reduced});
 controller.setTheme('light');
 return {controller,viewport,button,animations,setReduced:value=>{reduced=value;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('initial theme is sharp and still, using one visible icon',()=>{
 const t=setup();assert.equal(t.viewport.children.length,1);assert.equal(t.animations.length,0);
 assert.equal(t.viewport.children[0].dataset.themeIcon,'light');
 assert.equal(t.viewport.children[0].children[0].style.filter,'blur(0px)');
});
test('mid-flight clicks send the current icon forward instead of restoring its entry angle',()=>{
 const t=setup();t.controller.setTheme('dark',{animate:true});
 const entering=t.viewport.children.at(-1);entering.style.transform='rotate(-45deg)';
 t.controller.setTheme('light',{animate:true});
 const exit=t.animations.filter(a=>a.node===entering).at(-1);
 assert.equal(exit.from.transform,'rotate(-45deg)');assert.equal(exit.target.transform,'rotate(100deg)');
 assert.equal(entering.dataset.phase,'exit');assert.equal(t.viewport.children.at(-1).dataset.themeIcon,'light');
 const icon=t.viewport.children.at(-1).children[0];
 assert.equal(icon.style.transform,'rotate(100deg) scale(0.4)');assert.equal(icon.style.filter,'blur(4px)');assert.equal(icon.style.opacity,'.5');
 assert.deepEqual(exit.options,{type:'spring',visualDuration:.3,bounce:.2});
});
test('fifty-one rapid clicks settle to the final requested theme with no stale icons',async()=>{
 const t=setup();
 for(let i=0;i<51;i++)t.controller.setTheme(i%2?'light':'dark',{animate:true});
 const final=t.viewport.children.at(-1);assert.equal(final.dataset.themeIcon,'dark');
 for(const animation of t.animations)animation.controls.complete();await tick();
 assert.deepEqual(t.viewport.children,[final]);assert.equal(final.style.transform,'rotate(0deg)');
 assert.equal(final.children[0].style.filter,'blur(0px)');assert.equal(final.children[0].style.opacity,1);
});
test('an old entry completing cannot change a departing icon back to visible',async()=>{
 const t=setup();t.controller.setTheme('dark',{animate:true});const old=t.viewport.children.at(-1);
 const entry=t.animations.filter(a=>a.node===old||a.node===old.children[0]);
 t.controller.setTheme('light',{animate:true});for(const a of entry)a.controls.complete();await tick();
 assert.equal(old.dataset.phase,'exit');assert.equal(t.viewport.children.at(-1).dataset.themeIcon,'light');
});
test('keyboard and external theme changes remove pending exits immediately',async()=>{
 const t=setup();t.controller.setTheme('dark',{animate:true});t.controller.setTheme('light',{animate:true});
 const count=t.animations.length;t.controller.setTheme('dark');const final=t.viewport.children[0];
 assert.equal(t.viewport.children.length,1);assert.equal(final.dataset.themeIcon,'dark');assert.equal(t.animations.length,count);
 assert.ok(t.animations.every(a=>a.controls.stopped));
 for(const a of t.animations)a.controls.complete();await tick();assert.deepEqual(t.viewport.children,[final]);
});
test('enabling reduced motion settles an in-flight icon without movement or blur',()=>{
 const t=setup();t.controller.setTheme('dark',{animate:true});t.setReduced(true);t.controller.setTheme('dark');
 assert.equal(t.viewport.children.length,1);assert.equal(t.viewport.children[0].style.transform,'rotate(0deg)');
 const count=t.animations.length;t.controller.setTheme('light',{animate:true});assert.equal(t.animations.length,count);
 assert.equal(t.viewport.children[0].children[0].style.filter,'blur(0px)');
});
