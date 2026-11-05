import {animate as motionAnimate} from 'motion';

// The Graphical reference uses independent icon lifetimes and this spring.
const spring={type:'spring',visualDuration:.3,bounce:.2};
export function createThemeIconMotion(button,{animate=motionAnimate,reducedMotion=()=>false}={}){
 const viewport=button.querySelector('.theme-viewport');
 const templates=Object.fromEntries(['light','dark'].map(theme=>[theme,button.querySelector(theme==='light'?'.theme-sun':'.theme-moon').cloneNode(true)]));
 const records=new Set();let current=null;
 button.dataset.themeEngine='motion';viewport.replaceChildren();
 function discard(record){
  if(!records.delete(record))return;
  for(const controls of record.controls)controls.stop();record.orbit.remove();
 }
 function move(record,orbit,icon){
  const controls=[animate(record.orbit,{transform:`rotate(${orbit}deg)`},spring),animate(record.icon,icon,spring)];
  record.controls.push(...controls);return Promise.all(controls);
 }
 function mount(theme,enter){
  const orbit=button.ownerDocument.createElement('span'),icon=templates[theme].cloneNode(true);
  orbit.className='theme-orbit';orbit.dataset.themeIcon=theme;orbit.dataset.phase=enter?'enter':'visible';
  orbit.style.transform=`rotate(${enter?-100:0}deg)`;
  Object.assign(icon.style,{transform:enter?'rotate(100deg) scale(0.4)':'rotate(0deg) scale(1)',opacity:enter?'.5':'1',filter:enter?'blur(4px)':'blur(0px)'});
  orbit.append(icon);viewport.append(orbit);
  const record={theme,orbit,icon,controls:[]};records.add(record);
  if(enter)move(record,0,{transform:'rotate(0deg) scale(1)',opacity:1,filter:'blur(0px)'}).then(()=>{
   if(current===record&&record.orbit.dataset.phase==='enter')record.orbit.dataset.phase='visible';
  });
  return record;
 }
 return {setTheme(theme,{animate:shouldAnimate=false}={}){
  const reduced=reducedMotion();
  if(current?.theme===theme&&!reduced)return;
  if(!current||!shouldAnimate||reduced){
   for(const record of [...records])discard(record);
   current=mount(theme,false);button.dataset.themeMotion='instant';return;
  }
  const departing=current;departing.orbit.dataset.phase='exit';
  // Retarget the departing icon from its current spring position, always forward.
  move(departing,100,{transform:'rotate(-100deg) scale(0.4)',opacity:.5,filter:'blur(4px)'}).then(()=>discard(departing));
  current=mount(theme,true);button.dataset.themeMotion='orbit';
 }};
}
