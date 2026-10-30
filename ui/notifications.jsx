import React from 'react';
import {createRoot} from 'react-dom/client';
import {Toaster,toast} from 'sonner';
import 'sonner/dist/styles.css';

let container;
export function mountNotifications(){
 container=document.createElement('div');container.id='library-notifications';
 document.body.append(container);
 createRoot(container).render(<Toaster position="bottom-right" duration={6000} visibleToasts={3} offset={24} mobileOffset={16}
  customAriaLabel="Library notifications" toastOptions={{classNames:{toast:'library-toast',actionButton:'library-toast-action'}}}/>);
}
// A modal makes the rest of the document inert. Keep existing Undo actions
// reachable while another bookmark is open without remounting the toaster.
export function placeNotifications(parent=document.body){parent.append(container);}
export function showRemovalToast(message,undo,onExpire){
 let busy=false,id;
 const action={label:'Undo',onClick:async event=>{
  event.preventDefault();if(busy)return;busy=true;
  toast(message,{id,duration:Infinity,dismissible:false,action:{label:'Undoing…',onClick:event=>event.preventDefault()}});
  try{await undo();toast.dismiss(id);}
  catch{toast('Could not restore. Try Undo again.',{id,duration:10000,dismissible:true,action});}
  finally{busy=false;}
 }};
 id=toast(message,{duration:6000,action,onDismiss:onExpire,onAutoClose:onExpire});
}
export function showRemovalError(){toast('Could not remove. Please try again.',{duration:6000});}
