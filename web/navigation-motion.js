import {createFilterLayout} from './filter-layout.js';
// Instant filtering remains the default. Layout movement is an opt-in comparison
// and never delays rendering, locks the grid, or fades retained cards out.
export function createNavigationMotion(grid,render,{
 layoutEnabled=()=>false,
 reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches,
 layout=createFilterLayout(grid)
}={}){
 const clear=()=>{layout.stop();grid.inert=false;grid.removeAttribute('aria-busy');};
 return {
  async update({animate=true,direction=0}={}){
   const shouldMove=animate&&!direction&&layoutEnabled()&&!reducedMotion();
   const before=shouldMove?layout.capture():null;
   clear();render();
   if(before)try{layout.play(before);}catch(error){clear();throw error;}
  },
  settle:clear
 };
}
