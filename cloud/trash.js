// Reuse the owner's existing recoverable Trash; RLS remains the final boundary.
export async function updateReferenceTrash(db,userId,{id,deletedAt},restore=false){
 if(!/^[a-f0-9]{32}$/.test(id||''))throw Error('Invalid reference.');
 const timestamp=restore?null:new Date().toISOString();
 let mutation=db.from('library_references').update({deleted_at:timestamp}).eq('user_id',userId).eq('id',id);
 // Undo only its own removal, never a more recent removal from another tab.
 if(restore&&deletedAt)mutation=mutation.eq('deleted_at',deletedAt);
 const {data,error}=await mutation.select('id,deleted_at').single();
 if(error||!data)throw Error(restore?'Could not restore this reference. Please try again or open Trash.':'Could not remove this reference. Please try again.');
 return {ok:true,deletedAt:data.deleted_at};
}
