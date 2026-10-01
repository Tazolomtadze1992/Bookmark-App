import React, {forwardRef, useState} from 'react';
import {createRoot} from 'react-dom/client';

// Collection controls reuse the library's shared button and pill tokens.
const HeaderButton=forwardRef(function HeaderButton({className='',...props},ref){
 return <button ref={ref} type="button" className={`header-button ${className}`} {...props}/>;
});
const collections=[['x_post','Bookmarks','twitter'],['website','Websites','computer']];
const CollectionIcon=({icon})=><img className="collection-icon" src={`/icons/${icon}.svg`} alt=""/>;

function CollectionMenu({initialValue,onValueChange}){
 const [value,setValue]=useState(initialValue);
 const change=next=>{setValue(next);onValueChange(next);};
 return <div className="collection-switcher" role="group" aria-label="Library collection">
  {collections.map(([id,label,icon])=><HeaderButton key={id} className="collection-choice" aria-label={label} title={label} aria-pressed={value===id} onClick={()=>{if(value!==id)change(id);}}>
   <CollectionIcon icon={icon}/>
  </HeaderButton>)}
 </div>;
}

export function mountCollectionMenu(container,{value,onValueChange}){
 createRoot(container).render(<CollectionMenu initialValue={value} onValueChange={onValueChange}/>);
}
