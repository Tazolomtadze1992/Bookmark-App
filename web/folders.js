export function folderOptions(snapshot) {
  return Array.isArray(snapshot?.folders) ? snapshot.folders.filter(f => typeof f.id === 'string' && /^\d+$/.test(f.id) && typeof f.name === 'string' && Array.isArray(f.post_ids)) : [];
}
export function inFolder(item, selection, snapshot) {
  if (Array.isArray(selection)) return !selection.length || selection.some(id => inFolder(item, id, snapshot));
  if (selection === 'all') return true;
  const folders = folderOptions(snapshot);
  if (selection === 'unfiled') return (snapshot?.covered_ids || []).includes(item.post_id) && !folders.some(f => f.post_ids.includes(item.post_id));
  return folders.some(f => f.id === selection && f.post_ids.includes(item.post_id));
}

// Empty selection means All. Selecting folders combines their contents (OR).
export function toggleFolder(selection, id) {
  if (id === 'all') return [];
  return selection.includes(id) ? selection.filter(value => value !== id) : [...selection, id];
}
export function validFolderSelection(selection, snapshot) {
  const available = new Set(folderOptions(snapshot).map(folder => folder.id));
  if (snapshot?.synced_at) available.add('unfiled');
  return [...new Set(selection)].filter(id => available.has(id));
}
