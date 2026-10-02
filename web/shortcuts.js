// Single-letter shortcuts must never intercept typing or browser commands.
export function headerShortcut(event,{modalOpen=false}={}){
 if(event.defaultPrevented||event.repeat||event.isComposing||event.metaKey||event.ctrlKey||event.altKey||modalOpen)return null;
 if(event.target?.isContentEditable||event.target?.closest?.('input,textarea,select,[role="textbox"],[contenteditable]:not([contenteditable="false"])'))return null;
 return {x:'x_post',w:'website',d:'theme'}[event.key?.toLowerCase()]||null;
}
