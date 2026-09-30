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
  let animations=[],generation=0,phase='idle',closeResolve=null,shadowObserver=null;
  const media=()=>dialog.querySelector('.detail-media');
  const cover=()=>dialog.querySelector('.album-slide .media-image,.album-slide .motion-video,.detail-media>.motion-wrap,.detail-media>.media-image,.detail-media>.text-preview');
  const panels=()=>[dialog.querySelector('#close-detail'),dialog.querySelector('#detail-footer')];
  const shadows=()=>[...dialog.querySelectorAll('.detail-shadow')];
  function prepareShadows(){
    shadowObserver?.disconnect();for(const shadow of shadows())shadow.remove();
    const pairs=[...dialog.querySelectorAll('.detail-media .media-image,.detail-media .motion-video,.detail-media .text-preview')].map(target=>{
      const container=target.closest('.album-slide')||media(),shadow=document.createElement('span');
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
  function stop(){generation++;for(const a of animations)a.cancel();animations=[];dialog.classList.remove('detail-moving');const m=media();if(m)m.style.transformOrigin='';}
  function animate(node,frames,duration,easing='cubic-bezier(.22,1,.36,1)',pseudoElement) {if(node)animations.push(node.animate(frames,{duration,easing,fill:'both',...(pseudoElement?{pseudoElement}:{})}));}
  function geometry(){const from=sourceRect(),to=cover()?.getBoundingClientRect(),box=media()?.getBoundingClientRect();if(!from||from.bottom<=0||from.top>=innerHeight)return null;return cardTransform(from,to,box);}
  function completed(token,callback){Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(token===generation){stop();phase='idle';callback?.();}});}
  function open(from,enabled=true){
    stop();prepareShadows();phase='opening';if(!enabled){phase='idle';return;}
    const m=media(),target=cover(),g=target&&m?cardTransform(from,target.getBoundingClientRect(),m.getBoundingClientRect()):null;
    const duration=reduced.matches?120:320;
    if(m){if(g&&!reduced.matches){m.style.transformOrigin=g.origin;animate(m,[{transform:g.transform},{transform:'none'}],duration);}else animate(m,[{opacity:0},{opacity:1}],duration,'ease');}
    for(const shadow of shadows())animate(shadow,[{opacity:0},{opacity:1}],duration);
    for(const panel of panels())animate(panel,[{opacity:0,transform:'none'},{opacity:1,transform:'none'}],reduced.matches?120:280);
    animate(dialog,[{opacity:0},{opacity:1}],reduced.matches?120:240,'ease','::backdrop');
    animate(dialog.querySelector('.album-controls'),[{opacity:0},{opacity:1}],duration,'ease');
    dialog.classList.add('detail-moving');completed(generation);
  }
  function close(enabled=true){
    // Sample the current frame before cancelling: rapid close continues from the visible position.
    const nodes=[media(),...panels(),dialog.querySelector('.album-controls')].filter(Boolean);
    const frames=nodes.map(node=>({node,transform:getComputedStyle(node).transform,opacity:getComputedStyle(node).opacity}));
    const shadowFrames=shadows().map(node=>({node,opacity:getComputedStyle(node).opacity}));
    const oldOrigin=media()?.style.transformOrigin,backdropOpacity=getComputedStyle(dialog,'::backdrop').opacity;
    stop();phase='closing';if(!enabled){phase='idle';dialog.close();return Promise.resolve();}
    const m=media(),g=geometry(),track=dialog.querySelector('.album-track');
    // A different album slide must not turn into the cover image on its way back.
    const coverVisible=!track||track.scrollLeft<2;
    const morph=g&&coverVisible&&!reduced.matches;
    if(m)m.style.transformOrigin=oldOrigin||g?.origin||'';
    const duration=reduced.matches?100:260;
    for(const frame of frames){
      const isMedia=frame.node===m;
      const to=isMedia&&morph?{transform:g.transform,opacity:1}:{opacity:0,transform:isMedia||reduced.matches?'none':frame.node.classList.contains('detail-info')?'translateX(-28px)':'none'};
      animate(frame.node,[{transform:frame.transform,opacity:frame.opacity},to],duration,isMedia?'cubic-bezier(.22,1,.36,1)':'ease');
    }
    for(const {node,opacity} of shadowFrames)animate(node,[{opacity},{opacity:0}],duration);
    animate(dialog,[{opacity:backdropOpacity},{opacity:0}],duration,'ease','::backdrop');
    dialog.classList.add('detail-moving');
    return new Promise(resolve=>{closeResolve=resolve;completed(generation,()=>{dialog.close();closeResolve?.();closeResolve=null;});});
  }
  function settle(){if(!dialog.open){shadowObserver?.disconnect();shadowObserver=null;}const closing=phase==='closing';stop();phase='idle';if(closing){dialog.close();closeResolve?.();closeResolve=null;}}
  window.addEventListener('resize',settle);reduced.addEventListener('change',settle);
  return {open,close,settle};
}
