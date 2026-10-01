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
 const [animated,setAnimated]=useState(false);
 const change=(next,event)=>{const animate=event.detail>0;setAnimated(animate);setValue(next);onValueChange(next,{animate});};
 return <div className="collection-switcher" role="group" aria-label="Library collection" data-motion={animated?'animated':'instant'}>
  <span className="collection-selection" aria-hidden="true" style={{transform:`translateX(${collections.findIndex(([id])=>id===value)*36}px)`}}/>
  {collections.map(([id,label,icon])=><HeaderButton key={id} className="collection-choice" aria-label={label} title={label} aria-pressed={value===id} onClick={event=>{if(value!==id)change(id,event);}}>
   <CollectionIcon icon={icon}/>
  </HeaderButton>)}
 </div>;
}

export function mountCollectionMenu(container,{value,onValueChange}){
 createRoot(container).render(<CollectionMenu initialValue={value} onValueChange={onValueChange}/>);
}
