// The card and expanded media occupy one continuous space. Only transform/opacity tween.
export function cardTransform(from, to, container) {
  if (![from,to,container].every(r => r && r.width > 0 && r.height > 0)) return null;
  const scale=Math.min(from.width/to.width,from.height/to.height);
  return {
    origin:`${to.left+to.width/2-container.left}px ${to.top+to.height/2-container.top}px`,
    transform:`translate(${from.left+from.width/2-to.left-to.width/2}px, ${from.top+from.height/2-to.top-to.height/2}px) scale(${scale})`
  };
}
export function createDetailMotion(dialog, sourceRect) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let animations=[],generation=0,phase='idle',closeResolve=null,shadowObserver=null,returnLayer=null;
  const media=()=>dialog.querySelector('.detail-media');
  const track=()=>dialog.querySelector('.album-track');
  const slides=()=>[...dialog.querySelectorAll('.album-slide')];
  const primary=()=>slides()[0]||media();
  const cover=()=>slides()[0]?.querySelector('.media-image,.motion-video,.text-preview')||dialog.querySelector('.detail-media>.motion-wrap,.detail-media>.media-image,.detail-media>.text-preview');
  const panels=()=>[dialog.querySelector('#close-detail'),dialog.querySelector('#detail-footer')];
  const shadows=()=>[...dialog.querySelectorAll('.detail-shadow')];
  function prepareShadows(){
    shadowObserver?.disconnect();for(const shadow of shadows())shadow.remove();
    const pairs=[...dialog.querySelectorAll('.detail-media .media-image,.detail-media .motion-video,.detail-media .text-preview')].map(target=>{
      const container=target.closest('.album-frame')||target.closest('.album-slide')||media(),shadow=document.createElement('span');
      shadow.className='detail-shadow';shadow.setAttribute('aria-hidden','true');container.append(shadow);
      return {target,container,shadow};
    });
    const layout=()=>{for(const {target,container,shadow} of pairs){
      // Layout coordinates stay stable while the shared parent is transformed.
      let x=0,y=0,node=target;while(node&&node!==container){x+=node.offsetLeft;y+=node.offsetTop;node=node.offsetParent;}
      Object.assign(shadow.style,{left:`${x}px`,top:`${y}px`,width:`${target.offsetWidth}px`,height:`${target.offsetHeight}px`,borderRadius:getComputedStyle(target).borderRadius});
      if(target.classList.contains('motion-video'))shadow.style.borderRadius=getComputedStyle(target.parentElement).borderRadius;
    }};
    layout();shadowObserver=new ResizeObserver(layout);for(const {target,container} of pairs){shadowObserver.observe(target);shadowObserver.observe(container);}
  }
  function stop(){
    generation++;
    for(const a of animations)a.cancel();
    animations=[];
    returnLayer?.remove();returnLayer=null;if(track())track().style.visibility='';
    dialog.classList.remove('detail-moving');
    track()?.classList.remove('album-morphing');
    for(const node of [media(),...slides()])if(node)node.style.transformOrigin='';
  }
  function animate(node,frames,duration,easing='cubic-bezier(.22,1,.36,1)',pseudoElement,delay=0){
    if(node)animations.push(node.animate(frames,{duration,delay,easing,fill:'both',...(pseudoElement?{pseudoElement}:{})}));
  }
  function geometry(from=sourceRect()){
    const target=cover(),container=primary();
    if(!from||from.bottom<=0||from.top>=innerHeight||!target||!container)return null;
    return cardTransform(from,target.getBoundingClientRect(),container.getBoundingClientRect());
  }
  function completed(token,callback){
    Promise.allSettled(animations.map(a=>a.finished)).then(()=>{
      if(token!==generation)return;
      // Close the top layer before releasing filled effects: neighbors stay invisible at handoff.
      callback?.();stop();phase='idle';
    });
  }
  function open(from,enabled=true){
    stop();prepareShadows();phase='opening';
    if(!enabled){phase='idle';return;}
    const target=primary(),g=geometry(from),duration=reduced.matches?120:320;
    if(target){
      if(g&&!reduced.matches){
        track()?.classList.add('album-morphing');
        target.style.transformOrigin=g.origin;
        animate(target,[{transform:g.transform},{transform:'none'}],duration);
      }else animate(target,[{opacity:0},{opacity:1}],duration,'ease');
    }
    // The remaining attachments have no matching grid object. Reveal them in their own space.
    for(const neighbor of slides().slice(1))animate(neighbor,
      [{opacity:0,transform:reduced.matches?'none':'translateX(8px)'},{opacity:1,transform:'none'}],
      reduced.matches?120:240,'cubic-bezier(.22,1,.36,1)',undefined,reduced.matches?0:40);
    for(const shadow of shadows())animate(shadow,[{opacity:0},{opacity:1}],duration);
    for(const panel of panels())animate(panel,[{opacity:0},{opacity:1}],reduced.matches?120:280);
    animate(dialog,[{opacity:0},{opacity:1}],reduced.matches?120:240,'ease','::backdrop');
    dialog.classList.add('detail-moving');completed(generation);
  }
  function close(enabled=true){
    // Sample each independently moving part before cancelling an interrupted entrance.
    const album=track(),browsing=!!album?.querySelector('.album-frame')?.getAnimations().length;
    const coverVisible=!album||(album.scrollLeft<2&&!browsing);
    const active=slides()[Number(album?.dataset.activeIndex)||0]?.querySelector('.media-image,.motion-video,.text-preview');
    const activeRect=active?.getBoundingClientRect();
    // Freeze browsing only after sampling its on-screen position (including interrupted navigation).
    album?.dispatchEvent(new Event('album-freeze'));
    const target=coverVisible?primary():media();
    const neighbors=coverVisible?slides().slice(1):[];
    const sample=node=>({node,transform:getComputedStyle(node).transform,opacity:getComputedStyle(node).opacity});
    const mainFrame=target?sample(target):null,neighborFrames=neighbors.map(sample),panelFrames=panels().filter(Boolean).map(sample);
    const shadowFrames=shadows().map(sample),oldOrigin=target?.style.transformOrigin;
    const backdropOpacity=getComputedStyle(dialog,'::backdrop').opacity;
    stop();phase='closing';
    if(!enabled){dialog.close();phase='idle';return Promise.resolve();}
    const g=geometry(),morph=g&&coverVisible&&!reduced.matches,duration=reduced.matches?100:260;
    let returning=false;
    if(album&&!coverVisible&&!reduced.matches&&activeRect&&g){
      const frame=slides()[0].querySelector('.album-frame'),asset=cover();
      const width=frame.offsetWidth,height=frame.offsetHeight,assetWidth=asset.offsetWidth,assetHeight=asset.offsetHeight;
      if(width&&height&&assetWidth&&assetHeight){
        // The reference restores the cover at the current image's center, then returns that
        // single object to the grid. Never scroll the whole album back through its other images.
        returnLayer=document.createElement('div');returnLayer.className='album-return';returnLayer.setAttribute('aria-hidden','true');
        Object.assign(returnLayer.style,{left:`${activeRect.left+activeRect.width/2-width/2}px`,top:`${activeRect.top+activeRect.height/2-height/2}px`,width:`${width}px`,height:`${height}px`});
        frame.style.transform='none';returnLayer.append(frame);dialog.append(returnLayer);album.style.visibility='hidden';
        const coverRect=asset.getBoundingClientRect(),to=cardTransform(sourceRect(),coverRect,returnLayer.getBoundingClientRect());
        const scale=Math.min(activeRect.width/assetWidth,activeRect.height/assetHeight);
        returnLayer.style.transformOrigin=to.origin;
        animate(returnLayer,[{transform:`scale(${scale})`},{transform:to.transform}],duration);
        returning=true;
      }
    }
    if(mainFrame&&!returning){
      if(morph){album?.classList.add('album-morphing');target.style.transformOrigin=oldOrigin||g.origin;}
      animate(target,[{transform:mainFrame.transform,opacity:mainFrame.opacity},
        morph?{transform:g.transform,opacity:1}:{transform:'none',opacity:0}],duration);
    }
    for(const frame of neighborFrames)animate(frame.node,
      [{opacity:frame.opacity,transform:frame.transform},{opacity:0,transform:reduced.matches?'none':'translateX(8px)'}],
      reduced.matches?100:120);
    for(const frame of panelFrames)animate(frame.node,[{opacity:frame.opacity},{opacity:0}],duration,'ease');
    for(const frame of shadowFrames)animate(frame.node,[{opacity:frame.opacity},{opacity:0}],duration);
    animate(dialog,[{opacity:backdropOpacity},{opacity:0}],duration,'ease','::backdrop');
    dialog.classList.add('detail-moving');
    return new Promise(resolve=>{
      closeResolve=resolve;
      completed(generation,()=>{dialog.close();closeResolve?.();closeResolve=null;});
    });
  }
  function settle(){
    const closing=phase==='closing';
    if(closing)dialog.close();
    stop();phase='idle';
    if(!dialog.open){shadowObserver?.disconnect();shadowObserver=null;}
    if(closing){closeResolve?.();closeResolve=null;}
  }
  function beforeNavigate(){
    if(phase==='closing')return false;
    if(phase==='opening')settle();
    return true;
  }
  window.addEventListener('resize',settle);reduced.addEventListener('change',settle);
  return {open,close,settle,beforeNavigate};
}
