import React from 'react';

// shadcn Kbd's semantic composition with the library's surface tokens.
// https://ui.shadcn.com/docs/components/radix/kbd
export function Kbd({className='',...props}){
 return <kbd data-slot="kbd" className={`nav-kbd ${className}`} {...props}/>;
}
