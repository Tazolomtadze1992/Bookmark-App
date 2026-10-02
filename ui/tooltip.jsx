import React, {forwardRef} from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// shadcn's Radix composition, styled with the library's CSS rather than Tailwind.
// https://ui.shadcn.com/docs/components/radix/tooltip
const TooltipProvider=TooltipPrimitive.Provider;
const Tooltip=TooltipPrimitive.Root;
const TooltipTrigger=TooltipPrimitive.Trigger;
// Triggers extend 4px below their visible surface; -2px leaves a visible 2px gap.
const TooltipContent=forwardRef(function TooltipContent({className='',sideOffset=-2,...props},ref){
 return <TooltipPrimitive.Portal>
  <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} collisionPadding={8}
   className={`nav-tooltip ${className}`} {...props}/>
 </TooltipPrimitive.Portal>;
});
export {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider};
