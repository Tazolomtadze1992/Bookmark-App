// Search only saved library data. Author metadata never needs to be rendered.
function normalize(value){
 return String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
}
export function matchesReference(item,metadata,query){
 const terms=normalize(query).trim().split(/\s+/u).map(term=>term.replace(/^@/,'')).filter(Boolean);
 if(!terms.length)return true;
 const text=normalize([item.title,item.description,metadata?.text,metadata?.author_name,metadata?.author_handle,item.author_observed,item.url].filter(Boolean).join(' '));
 return terms.every(term=>text.includes(term));
}
export function searchShortcut(event,{modalOpen=false}={}){
 if(event.defaultPrevented||event.repeat||event.isComposing||event.altKey||event.shiftKey||modalOpen)return false;
 if((event.metaKey||event.ctrlKey)&&event.key?.toLowerCase()==='k')return true;
 const typing=event.target?.isContentEditable||event.target?.closest?.('input,textarea,select,[role="textbox"],[contenteditable]:not([contenteditable="false"])');
 return event.key==='/'&&!event.metaKey&&!event.ctrlKey&&!typing;
}
