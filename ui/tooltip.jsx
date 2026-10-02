import React, {createContext,forwardRef,useCallback,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// shadcn's Radix composition, styled with the library's CSS rather than Tailwind.
// https://ui.shadcn.com/docs/components/radix/tooltip
const MotionGroup=createContext(null);
const TooltipMotion=createContext(null);
function TooltipProvider({children,...props}){
 const members=useRef(new Set());
 return <MotionGroup.Provider value={members.current}><TooltipPrimitive.Provider {...props}>{children}</TooltipPrimitive.Provider></MotionGroup.Provider>;
}
function Tooltip({children,open:controlledOpen,defaultOpen=false,onOpenChange,...props}){
 const group=useContext(MotionGroup);
 const [open,setOpen]=useState(defaultOpen);
 const [motion,setMotion]=useState('instant');
 const [exiting,setExiting]=useState(false);
 const current=useRef({open:controlledOpen??defaultOpen,exiting:false,interaction:'instant',timer:0});
 const content=useRef(null);
 const changeRef=useRef(null);
 const finishExit=useCallback(()=>{
  window.clearTimeout(current.current.timer);
  current.current.exiting=false;
  setExiting(false);
 },[]);
 const dismiss=useCallback(()=>{
  current.current.interaction='instant';
  finishExit();
  if(current.current.open)changeRef.current(false);
 },[finishExit]);
 useEffect(()=>{
  group?.add(dismiss);
  return ()=>{group?.delete(dismiss);window.clearTimeout(current.current.timer);};
 },[group,dismiss]);
 const prepare=interaction=>{
  current.current.interaction=interaction;
  for(const other of group??[])if(other!==dismiss)other();
 };
 const handleChange=next=>{
  if(next===current.current.open)return;
  if(next){
   for(const other of group??[])if(other!==dismiss)other();
   const resume=current.current.exiting;
   finishExit();
   setMotion(resume?'resume':current.current.interaction);
  }else if(current.current.interaction==='pointer'&&content.current){
   current.current.exiting=true;
   setExiting(true);
   setMotion('exit');
   // transitionend normally removes the node; this bounds missing-event cleanup.
   current.current.timer=window.setTimeout(finishExit,130);
  }else finishExit();
  current.current.open=next;
  setOpen(next);
  onOpenChange?.(next);
 };
 changeRef.current=handleChange;
 useLayoutEffect(()=>{
  if(controlledOpen!==undefined&&controlledOpen!==current.current.open)handleChange(controlledOpen);
 },[controlledOpen]);
 return <TooltipMotion.Provider value={{open:controlledOpen??open,exiting,motion,content,prepare,dismiss,finishExit,current}}>
  <TooltipPrimitive.Root {...props} open={controlledOpen??open} onOpenChange={handleChange}>{children}</TooltipPrimitive.Root>
 </TooltipMotion.Provider>;
}
const TooltipTrigger=forwardRef(function TooltipTrigger({onPointerMove,onFocus,onBlur,onPointerDown,onClick,...props},ref){
 const motion=useContext(TooltipMotion);
 const handle=(handler,action)=>event=>{handler?.(event);if(!event.defaultPrevented)action(event);};
 return <TooltipPrimitive.Trigger {...props} ref={ref}
  onPointerMove={handle(onPointerMove,event=>{if(event.pointerType!=='touch')motion.prepare('pointer');})}
  onFocus={handle(onFocus,()=>motion.prepare('instant'))}
  onBlur={handle(onBlur,motion.dismiss)} onPointerDown={handle(onPointerDown,motion.dismiss)} onClick={handle(onClick,motion.dismiss)}/>;
});
// Triggers extend 4px below their visible surface; -2px leaves a visible 2px gap.
const TooltipContent=forwardRef(function TooltipContent({className='',sideOffset=-2,onPlaced,onEscapeKeyDown,onPointerDownOutside,onTransitionEnd,...props},ref){
 const state=useContext(TooltipMotion);
 const [placed,setPlaced]=useState(false);
 useLayoutEffect(()=>{if(!state.open&&!state.exiting)setPlaced(false);},[state.open,state.exiting]);
 if(!state.open&&!state.exiting)return null;
 return <TooltipPrimitive.Portal forceMount>
  <TooltipPrimitive.Content {...props} forceMount ref={node=>{state.content.current=node;if(typeof ref==='function')ref(node);else if(ref)ref.current=node;}}
   sideOffset={sideOffset} collisionPadding={8} className={`nav-tooltip ${className}`}
   data-motion={state.motion} data-ready={placed} aria-hidden={state.exiting||undefined}
   onPlaced={()=>{setPlaced(true);onPlaced?.();}}
   onEscapeKeyDown={event=>{onEscapeKeyDown?.(event);if(!event.defaultPrevented)state.dismiss();}}
   onPointerDownOutside={event=>{onPointerDownOutside?.(event);if(!event.defaultPrevented)state.dismiss();}}
   onTransitionEnd={event=>{onTransitionEnd?.(event);if(event.target===event.currentTarget&&event.propertyName==='opacity'&&state.current.current.exiting)state.finishExit();}}/>
 </TooltipPrimitive.Portal>;
});
export {Tooltip,TooltipTrigger,TooltipContent,TooltipProvider};
