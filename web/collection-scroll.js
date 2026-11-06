// Save before replacing the grid: a shorter collection can clamp the page scroll.
// Restore after layout, in the same task, so another list's position never paints.
export function createCollectionScroll(initial,{read=()=>window.scrollY,restore=top=>window.scrollTo({top,left:0,behavior:'instant'})}={}){
 const positions=new Map();let current=initial;
 return {change(next,render){
  if(next===current)return;
  positions.set(current,read());
  current=next;
  render();
  restore(positions.get(next)??0);
 }};
}
