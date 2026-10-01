import React, {forwardRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// The same Radix composition used by shadcn, styled with the library's pill tokens.
const HeaderButton=forwardRef(function HeaderButton({className='',...props},ref){
 return <button ref={ref} type="button" className={`header-button ${className}`} {...props}/>;
});
const collections=[['x_post','X bookmarks'],['website','Websites']];

function CollectionMenu({initialValue,onValueChange}){
 const [value,setValue]=useState(initialValue);
 const change=next=>{setValue(next);onValueChange(next);};
 return <DropdownMenu.Root modal={false}>
  <DropdownMenu.Trigger asChild>
   <HeaderButton className="collection-trigger" aria-label={`Library collection: ${collections.find(([id])=>id===value)[1]}`}>
    <span>{collections.find(([id])=>id===value)[1]}</span>
    <img src="/icons/chevron-down.svg" alt=""/>
   </HeaderButton>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
   <DropdownMenu.Content className="collection-content" align="start" sideOffset={4} collisionPadding={16} aria-label="Library collection">
    <DropdownMenu.RadioGroup value={value} onValueChange={change}>
     {collections.map(([id,label])=><DropdownMenu.RadioItem key={id} value={id} className="collection-item">
      <span>{label}</span>
      <DropdownMenu.ItemIndicator className="collection-indicator">
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>
      </DropdownMenu.ItemIndicator>
     </DropdownMenu.RadioItem>)}
    </DropdownMenu.RadioGroup>
   </DropdownMenu.Content>
  </DropdownMenu.Portal>
 </DropdownMenu.Root>;
}

export function mountCollectionMenu(container,{value,onValueChange}){
 createRoot(container).render(<CollectionMenu initialValue={value} onValueChange={onValueChange}/>);
}
