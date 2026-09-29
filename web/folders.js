export function folderOptions(snapshot) {
  return Array.isArray(snapshot?.folders) ? snapshot.folders.filter(f => typeof f.id === 'string' && /^\d+$/.test(f.id) && typeof f.name === 'string' && Array.isArray(f.post_ids)) : [];
}
export function inFolder(item, selection, snapshot) {
  if (selection === 'all') return true;
  const folders = folderOptions(snapshot);
  if (selection === 'unfiled') return (snapshot?.covered_ids || []).includes(item.post_id) && !folders.some(f => f.post_ids.includes(item.post_id));
  return folders.some(f => f.id === selection && f.post_ids.includes(item.post_id));
}
