"""One-time owner-authenticated handoff. Run only with the local server stopped.

Credentials go directly to the owner's existing Supabase project over HTTPS,
then into Vault. They are never printed or written into a transfer file.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server import Store
from cloud_sync import CloudSync, atomic_json

store = Store(ROOT / '.capture-data')
cloud = CloudSync(store, 8765)
state_path = store.directory / 'bookmark-sync.json'
state = json.loads(state_path.read_text())
credentials = json.loads((store.directory / 'bookmark-oauth.json').read_text())
if state.get('cloud_migrated'):
    raise SystemExit('Already handed off. Do not copy stale credentials again.')
state['enabled'] = False
atomic_json(state_path, state)
cloud.session['enabled'] = False
atomic_json(cloud.path, cloud.session)
access = cloud.access()
cloud.request('/functions/v1/library-service/migrate', 'POST',
              {'state': state, 'credentials': credentials}, access=access)
state['cloud_migrated'] = True
state['message'] = 'Moved to the cloud library. Local checks are disabled.'
atomic_json(state_path, state)
cloud.session['cloud_migrated'] = True
atomic_json(cloud.path, cloud.session)
print(json.dumps({'migrated': True, 'excluded_bookmarks': len(state['baseline_ids']),
                  'reserved_units': state['reserved_units'], 'cloud_checks_enabled': False}))
