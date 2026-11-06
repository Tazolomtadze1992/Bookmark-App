// Read-only X folder mirror. Publish only a complete traversal; never import posts here.
export const FOLDER_INTERVAL_SECONDS = 86400;
// X may ignore smaller requested sizes and return a fixed batch of 20 IDs.
const FOLDER_PAGE_SIZE = 20;
export function folderSyncDue(state, force = false, now = Date.now() / 1000) {
  return force || !state.folder_last_attempt || now - (state.folder_last_attempt || 0) >= FOLDER_INTERVAL_SECONDS;
}
function pageRows(result) {
  // Verified against the real endpoint: HTTP 200 with {} means no folders.
  // Accept this empty-collection representation for folder contents too.
  const empty = result && typeof result === 'object' && !Array.isArray(result) && Object.keys(result).length === 0;
  if (!result || result.errors?.length || (result.data !== undefined && !Array.isArray(result.data)) || (!empty && !Array.isArray(result.data) && result.meta?.result_count !== 0)) {
    throw Error('X folder response was incomplete. Previous folders kept.');
  }
  const rows = result.data || [];
  if (rows.length > FOLDER_PAGE_SIZE || rows.some(row => typeof row.id !== 'string' || !/^\d{1,25}$/.test(row.id))) {
    throw Error('Invalid X folder response. Previous folders kept.');
  }
  return rows;
}
export async function readFolderSnapshot({get, userId, knownIds, postAliases = {}, now = () => Date.now(), maxRequests = 20, timeoutMs = 45000}) {
  const started = now(), known = new Set(knownIds);
  let requests = 0;
  async function allPages(path, folderList = false) {
    const rows = [], seenIds = new Set(), tokens = new Set();
    let token = '', paginated = false;
    do {
      if (++requests > maxRequests || now() - started >= timeoutMs) throw Error('Folder scan limit reached. Previous folders kept.');
      const params = new URLSearchParams({max_results: String(FOLDER_PAGE_SIZE)});
      if (token) params.set('pagination_token', token);
      // Reserve before each request, within the same atomic allowance as bookmark reads.
      const result = await get(`${path}?${params}`, FOLDER_PAGE_SIZE * 5);
      const page = pageRows(result);
      for (const row of page) {
        if (seenIds.has(row.id)) throw Error('X folders changed during the scan. Previous folders kept.');
        seenIds.add(row.id);
        if (folderList && (typeof row.name !== 'string' || !row.name.trim() || row.name.length > 500)) throw Error('Invalid X folder name. Previous folders kept.');
        rows.push(row);
      }
      token = result.meta?.next_token || '';
      if (typeof token !== 'string' || token.length > 4096 || (token && (!page.length || tokens.has(token)))) throw Error('Repeated or invalid X folder page. Previous folders kept.');
      if (token) {tokens.add(token);paginated = true;}
    } while (token);
    // A single full batch without a cursor is ambiguous on this endpoint.
    // Never present that known X API limitation as a complete folder traversal.
    return {rows, complete: paginated || rows.length < FOLDER_PAGE_SIZE};
  }
  const base = `/2/users/${userId}/bookmarks/folders`;
  const listing = await allPages(base, true), folders = listing.rows;
  const snapshot = [];
  let complete = listing.complete;
  for (const folder of folders) {
    const posts = await allPages(`${base}/${folder.id}`);
    complete &&= posts.complete;
    // Folder endpoints may identify the latest edit while the saved card uses
    // an earlier version. Match verified edit families without importing cards.
    const matches = posts.rows.flatMap(p => [p.id, ...(postAliases[p.id] || [])]).filter(id => known.has(id));
    snapshot.push({id: folder.id, name: folder.name, post_ids: [...new Set(matches)], source_count: posts.rows.length, complete: posts.complete});
  }
  return {folders: snapshot, covered_ids: complete ? [...known] : [], synced_at: now() / 1000, complete};
}
export async function updateFolders({state, force = false, knownIds, postAliases = {}, get, now = () => Date.now()}) {
  const seconds = now() / 1000;
  if (!folderSyncDue(state, force, seconds)) return {};
  try {
    const snapshot = await readFolderSnapshot({get, userId: state.user_id, knownIds, postAliases, now});
    if (!snapshot.complete) return {folder_last_attempt: seconds, folder_partial_snapshot: snapshot, folder_sync_issue: 'partial', folder_error: 'X returned a full folder batch without a continuation page. Previous complete assignments kept.'};
    return {folder_snapshot: snapshot, folder_last_attempt: seconds, folder_sync_issue: '', folder_partial_snapshot: null, folder_error: ''};
  } catch (e) {
    // A folder failure never erases the last complete snapshot or bookmark checkpoint.
    return {folder_last_attempt: seconds, folder_error: e instanceof Error ? e.message : 'Could not sync folders. Previous folders kept.'};
  }
}
