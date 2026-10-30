import React, {forwardRef, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider} from './tooltip.jsx';
import {Kbd} from './kbd.jsx';
import {headerShortcut} from '../web/shortcuts.js';

// Collection controls reuse the library's shared button and pill tokens.
const HeaderButton=forwardRef(function HeaderButton({className='',...props},ref){
 return <button ref={ref} type="button" className={`header-button ${className}`} {...props}/>;
});
const collections=[['x_post','Bookmarks','twitter'],['website','Websites','computer']];
const CollectionIcon=({icon})=><img className="collection-icon" src={`/icons/${icon}.svg`} alt=""/>;

function CollectionChoice({id,label,icon,selected,onChange}){
 return <Tooltip>
  <TooltipTrigger asChild>
   <HeaderButton className="collection-choice" aria-label={label} aria-pressed={selected} aria-keyshortcuts={id==='x_post'?'X':'W'}
    onClick={event=>{if(!selected)onChange(id,event);}}>
    <CollectionIcon icon={icon}/>
   </HeaderButton>
  </TooltipTrigger>
  <TooltipContent side="bottom">
   <span>{id==='x_post'?'Bookmark':'Websites'}</span><Kbd>{id==='x_post'?'X':'W'}</Kbd>
  </TooltipContent>
 </Tooltip>;
}

function ThemeChoice(){
 useEffect(()=>{window.libraryTheme.refresh();},[]);
 return <Tooltip>
  <TooltipTrigger asChild>
   <HeaderButton className="theme-icon" data-theme-toggle aria-label="Toggle theme" aria-keyshortcuts="D"
    onClick={event=>window.libraryTheme.toggle({animate:event.detail>0})}>
    <span className="theme-viewport" aria-hidden="true"><span className="theme-orbit">
     <span className="theme-body theme-sun"><img src="/icons/sun.svg" alt=""/></span>
     <span className="theme-body theme-moon"><img src="/icons/moon.svg" alt=""/></span>
    </span></span>
   </HeaderButton>
  </TooltipTrigger>
  <TooltipContent side="bottom"><span>Toggle theme</span><Kbd>D</Kbd></TooltipContent>
 </Tooltip>;
}

function SearchChoice({onSearchOpen}){
 const [expanded,setExpanded]=useState(false);
 const mac=/Mac|iPhone|iPad/.test(navigator.platform);
 useEffect(()=>{
  const onToggle=event=>setExpanded(event.detail.open);
  window.addEventListener('library-search-toggle',onToggle);
  return ()=>window.removeEventListener('library-search-toggle',onToggle);
 },[]);
 return <Tooltip open={expanded?false:undefined}>
  <TooltipTrigger asChild>
   <HeaderButton className="search-toggle" aria-label="Search" aria-controls="library-search" aria-expanded={expanded}
    aria-keyshortcuts="Meta+K Control+K /" aria-hidden={expanded||undefined} tabIndex={expanded?-1:0}
    onClick={event=>onSearchOpen({animate:event.detail>0})}>
    <img src="/icons/magnifying-glass.svg" alt=""/>
   </HeaderButton>
  </TooltipTrigger>
  <TooltipContent side="bottom"><span>Search</span><Kbd>{mac?<span className="search-command"/>:'Ctrl'}</Kbd><Kbd>K</Kbd></TooltipContent>
 </Tooltip>;
}

function CollectionMenu({initialValue,onValueChange,themeContainer,searchContainer,onSearchOpen}){
 const [value,setValue]=useState(initialValue);
 const [animated,setAnimated]=useState(false);
 const change=(next,event)=>{const animate=event.detail>0;setAnimated(animate);setValue(next);onValueChange(next,{animate});};
 useEffect(()=>{
  const onKey=event=>{
   const action=headerShortcut(event,{modalOpen:!!document.querySelector('dialog[open]')});
   if(!action)return;
   event.preventDefault();
   if(action==='theme')window.libraryTheme.toggle({animate:false});
   else if(action!==value)change(action,{detail:0});
  };
  document.addEventListener('keydown',onKey);
  return ()=>document.removeEventListener('keydown',onKey);
 },[value]);
 return <TooltipProvider delayDuration={350} skipDelayDuration={700}><div className="collection-switcher" role="group" aria-label="Library collection" data-motion={animated?'animated':'instant'}>
  <span className="collection-selection" aria-hidden="true" style={{transform:`translateX(${collections.findIndex(([id])=>id===value)*40}px)`}}/>
  {collections.map(([id,label,icon])=><CollectionChoice key={id} id={id} label={label} icon={icon} selected={value===id} onChange={change}/>)}
 </div>{createPortal(<SearchChoice onSearchOpen={onSearchOpen}/>,searchContainer)}{createPortal(<ThemeChoice/>,themeContainer)}</TooltipProvider>;
}

export function mountCollectionMenu(container,{value,onValueChange,themeContainer,searchContainer,onSearchOpen}){
 themeContainer.replaceChildren();
 searchContainer.replaceChildren();
 createRoot(container).render(<CollectionMenu initialValue={value} onValueChange={onValueChange} themeContainer={themeContainer} searchContainer={searchContainer} onSearchOpen={onSearchOpen}/>);
}
