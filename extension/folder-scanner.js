(function(root){
 // Executed only in an extension-owned X tab, in Chrome's isolated world.
 // The only clicks are navigation tabs and folder radio items.
 function domStep(action='read',args={}){
  const selected=document.querySelector('main [role="tab"][aria-selected="true"]');
  const menu=[...document.querySelectorAll('[role="menu"] [role="menuitemradio"]')];
  if(action==='open')selected?.click();
  if(action==='choose'){
   const choice=menu[args.index+1];
   if(!choice||choice.textContent.trim()!==args.name)throw Error('X folder menu changed during the check.');
   choice.click();
  }
  if(action==='scroll')window.scrollBy({top:Math.max(200,innerHeight*.6),behavior:'instant'});
  const account=document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')?.textContent.match(/@([A-Za-z0-9_]{1,15})/)?.[1]||document.querySelector('nav a[aria-label="Profile"]')?.getAttribute('href')?.slice(1);
  const posts=[...document.querySelectorAll('main article')].map(n=>{
   const href=n.querySelector('time')?.closest('a')?.getAttribute('href'),id=href?.match(/\/status\/(\d{1,25})(?:$|\/)/)?.[1];
   return id?{id,href:href.split('?')[0]}:null;
  }).filter(Boolean);
  const primary=document.querySelector('main [data-testid="primaryColumn"]')||document.querySelector('main');
  const error=!!primary&&[...primary.querySelectorAll('button')].some(n=>/^(Retry|Try again)$/.test(n.textContent.trim()));
  return {account:account?.toLowerCase(),path:location.pathname,selected:selected?.textContent.trim(),menuOpen:!!document.querySelector('[role="menu"]'),menuLoaded:menu.length>0,error,
   menu:[...document.querySelectorAll('[role="menu"] [role="menuitemradio"]')].slice(1).map(n=>n.textContent.trim()),
   posts,loading:!!document.querySelector('main [role="progressbar"],[role="menu"] [role="progressbar"]'),empty:!!document.querySelector('main [data-testid="emptyState"]'),
   history:!![...document.querySelectorAll('main h1,main h2')].find(n=>n.textContent==='Edit History'),
   top:document.scrollingElement.scrollTop,max:document.scrollingElement.scrollHeight-document.scrollingElement.clientHeight};
 }
 async function scan(driver,{account,now=()=>Date.now(),timeout=240000}={}){
  const started=now(),refs={},folders=[];let page;
  const check=p=>{if(now()-started>timeout)throw Error('Folder check took too long. It will retry.');if(p.error)throw Error('X could not finish loading folders. It will retry.');if(p.account&&p.account!==account.toLowerCase())throw Error('Sign in to the linked X account: @'+account+'.');};
  async function ready(predicate){
   const until=now()+20000;
   do{page=await driver.step('read');check(page);if(page.account&&predicate(page))return page;await driver.pause(400);}while(now()<until);
   throw Error(page?.account?'X did not finish loading. It will retry.':'Sign in to X in Chrome to resume automatic folders.');
  }
  async function openMenu(){await driver.step('open');await driver.pause(700);return ready(p=>p.menuOpen&&p.menuLoaded!==false&&!p.loading);}
  await driver.navigate('/i/history');await ready(p=>p.selected&&!p.loading);const listing=await openMenu(),names=[...listing.menu];
  if(names.length>100)throw Error('Too many folders for one check.');
  for(let index=0;index<names.length;index++){
   if(index)await openMenu();
   await driver.step('choose',{index,name:names[index]});await driver.pause(500);
   await ready(p=>p.path.includes('/bookmarks/')&&p.selected===names[index]&&!p.loading&&(p.posts.length||p.empty));
   const id=page.path.match(/\/bookmarks\/(\d{1,25})$/)?.[1];if(!id)throw Error('Could not identify the X folder.');
   const ids=new Set();let stableSince=now(),previousSize=-1,previousMax=-1;
   while(true){
    check(page);if(!page.account)throw Error('Sign in to X in Chrome to resume automatic folders.');
    for(const post of page.posts){ids.add(post.id);refs[post.id]=post.href;}
    if(ids.size>10000)throw Error('Folder check exceeded its size limit.');
    const bottom=page.top>=page.max-2;
    if(ids.size!==previousSize||page.max!==previousMax||page.loading||!bottom)stableSince=now();
    previousSize=ids.size;previousMax=page.max;
    if(page.empty&&!page.loading||bottom&&!page.loading&&now()-stableSince>=3000)break;
    await driver.step('scroll');await driver.pause(400);page=await driver.step('read');
   }
   folders.push({id,name:names[index],post_ids:[...ids],complete:true});
  }
  // A changed folder list invalidates the traversal instead of deleting names.
  const finalMenu=folders.length?await openMenu():listing;
  if(JSON.stringify(finalMenu.menu)!==JSON.stringify(names))throw Error('X folders changed during the check. It will retry.');
  return {account_handle:account.toLowerCase(),complete:true,observed_at:now()/1000,folders,refs,edit_families:[]};
 }
 async function histories(driver,scan,ids,{now=()=>Date.now()}={}){
  if(ids.length>50)throw Error('Too many unmatched posts for one check.');
  for(const id of ids){
   const href=scan.refs[id];if(!href||!/^\/[A-Za-z0-9_]+\/status\/\d+$/.test(href))continue;
   await driver.navigate(href+'/history');const until=now()+15000;let page;
   do{await driver.pause(400);page=await driver.step('read');if(page.account&&page.account!==scan.account_handle)throw Error('Sign in to the linked X account.');if(page.account&&!page.loading&&page.history)break;}while(now()<until);
   if(!page?.account||page.loading||!page.history)throw Error('X could not verify an edited post. It will retry.');
   const family=[...new Set([id,...page.posts.map(p=>p.id)])];
   if(family.length>10)throw Error('Invalid X edit history.');scan.edit_families.push(family);
  }
  scan.observed_at=now()/1000;return scan;
 }
 const api={domStep,scan,histories};root.AutomaticFolders=api;
 if(typeof module!=='undefined')module.exports=api;
})(globalThis);
