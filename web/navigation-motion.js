// Frequent filtering must not blank, delay, or lock the results. The navigation
// controls keep their own feedback; media stays alive throughout the update.
export function createNavigationMotion(grid,render){
 const clear=()=>{grid.inert=false;grid.removeAttribute('aria-busy');};
 return {
  async update(){clear();render();},
  settle:clear
 };
}
