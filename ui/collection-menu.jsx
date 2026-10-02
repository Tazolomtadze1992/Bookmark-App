import React, {forwardRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from './tooltip.jsx';

// Collection controls reuse the library's shared button and pill tokens.
const HeaderButton=forwardRef(function HeaderButton({className='',...props},ref){
 return <button ref={ref} type="button" className={`header-button ${className}`} {...props}/>;
});
const collections=[['x_post','Bookmarks','twitter'],['website','Websites','computer']];
const CollectionIcon=({icon})=><img className="collection-icon" src={`/icons/${icon}.svg`} alt=""/>;

function CollectionChoice({id,label,icon,selected,onChange}){
 const [keyboard,setKeyboard]=useState(false);
 return <Tooltip>
  <TooltipTrigger asChild>
   <HeaderButton className="collection-choice" aria-label={label} aria-pressed={selected}
    onFocus={()=>setKeyboard(true)} onPointerMove={()=>setKeyboard(false)}
    onClick={event=>{if(!selected)onChange(id,event);}}>
    <CollectionIcon icon={icon}/>
   </HeaderButton>
  </TooltipTrigger>
  <TooltipContent side="bottom" data-motion={keyboard?'instant':'animated'}>
   {id==='x_post'?'Bookmark':'Websites'}
  </TooltipContent>
 </Tooltip>;
}

function CollectionMenu({initialValue,onValueChange}){
 const [value,setValue]=useState(initialValue);
 const [animated,setAnimated]=useState(false);
 const change=(next,event)=>{const animate=event.detail>0;setAnimated(animate);setValue(next);onValueChange(next,{animate});};
 return <TooltipProvider delayDuration={350} skipDelayDuration={200}><div className="collection-switcher" role="group" aria-label="Library collection" data-motion={animated?'animated':'instant'}>
  <span className="collection-selection" aria-hidden="true" style={{transform:`translateX(${collections.findIndex(([id])=>id===value)*40}px)`}}/>
  {collections.map(([id,label,icon])=><CollectionChoice key={id} id={id} label={label} icon={icon} selected={value===id} onChange={change}/>)}
 </div></TooltipProvider>;
}

export function mountCollectionMenu(container,{value,onValueChange}){
 createRoot(container).render(<CollectionMenu initialValue={value} onValueChange={onValueChange}/>);
}
