"""Read-only OAuth bookmark sync. No old-bookmark import and no implicit activation.

Baseline IDs are private exclusion metadata, never library cards. Ambiguous
pagination/order, errors, exhausted budgets and incomplete baselines fail closed.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SCOPES = 'tweet.read users.read bookmark.read offline.access'
INTERVAL = 15 * 60
MAX_BASELINE_PAGES = 5
MAX_SYNC_PAGES = 5
BUDGET_UNITS = 3000  # Conservative $3 estimate, independent of provider's $5 hard cap.


def save_json(path, value):
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as f:
        json.dump(value, f)
    temp.chmod(0o600)
    temp.replace(path)


def read_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class SyncError(ValueError):
    pass


def request_json(path, token=None, form=None):
    # Fixed official destination; no caller-controlled origin and no redirects.
    headers = {'Accept': 'application/json', 'User-Agent': 'ReferenceCaptureLab/0.2'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = None
    if form is not None:
        data = urllib.parse.urlencode(form).encode()
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
    req = urllib.request.Request('https://api.x.com' + path, data=data, headers=headers)
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=25) as response:
            raw = response.read(3_000_001)
            if len(raw) > 3_000_000:
                raise SyncError('X response exceeded the small-test limit. Sync paused.')
            result = json.loads(raw)
            if not isinstance(result, dict):
                raise SyncError('Unexpected X response. Sync paused.')
            return result
    except urllib.error.HTTPError as exc:
        raise SyncError(f'X returned HTTP {exc.code}. Sync paused; no automatic retry.') from None
    except (OSError, ValueError) as exc:
        if isinstance(exc, SyncError):
            raise
        raise SyncError('X connection or response failed. Sync paused; no automatic retry.') from None


def post_ids(response):
    if response.get('errors'):
        raise SyncError('X returned a partial result. No baseline or sync checkpoint advanced.')
    posts = response.get('data', [])
    if not isinstance(posts, list):
        raise SyncError('Invalid bookmark list. Sync paused.')
    ids = [p.get('id') for p in posts if isinstance(p, dict)]
    if len(ids) != len(posts) or any(not isinstance(i, str) or not re.fullmatch(r'\d{1,25}', i) for i in ids) or len(set(ids)) != len(ids):
        raise SyncError('Invalid or repeated bookmark IDs. Sync paused.')
    return ids


def new_prefix(ids, anchors, excluded, seen):
    """Only accept an unambiguous new prefix before a known bookmark anchor.

    Post publication time/ID magnitude never defines newness. Known old IDs
    stay excluded even if re-bookmarked. Unknown tail entries are never imported.
    """
    if len(ids) != len(set(ids)):
        raise SyncError('Overlapping bookmark pages. Nothing imported; sync paused.')
    known_positions = [anchors.index(i) for i in ids if i in anchors]
    if known_positions != sorted(known_positions):
        raise SyncError('X bookmark ordering changed. Nothing imported; sync paused.')
    overlap = next((n for n, i in enumerate(ids) if i in anchors), None)
    if anchors and overlap is None:
        raise SyncError('Could not find the previous bookmark checkpoint. Nothing imported; sync paused.')
    prefix = ids if overlap is None else ids[:overlap]
    return [i for i in prefix if i not in excluded and i not in seen]


class BookmarkSync:
    def __init__(self, directory, store, port):
        self.directory, self.store = Path(directory), store
        self.state_path = self.directory / 'bookmark-sync.json'
        self.credentials_path = self.directory / 'bookmark-oauth.json'
        self.media_path = self.directory / 'bookmark-media.json'
        self.callback = f'http://127.0.0.1:{port}/oauth/x/callback'
        self.lock = threading.RLock()
        self.pending = None
        self.stop_event = threading.Event()
        self.state = read_json(self.state_path, {'phase': 'disconnected', 'enabled': False, 'reserved_units': 0, 'requests': 0, 'baseline_ids': [], 'seen_ids': [], 'anchors': [], 'imported': 0, 'message': 'Not connected. Existing X bookmarks will not be imported.'})
        self.credentials = read_json(self.credentials_path, {})
        # Require explicit resume after restart until the real sync has been validated.
        if self.state.get('enabled'):
            self.state.update(enabled=False, message='Server restarted. Resume sync when ready.')
            self.persist()

    def persist(self):
        save_json(self.state_path, self.state)

    def status(self):
        with self.lock:
            return {'phase': self.state['phase'], 'enabled': self.state.get('enabled', False), 'connected': bool(self.credentials.get('access_token')), 'baseline_count': len(self.state.get('baseline_ids', [])), 'imported': self.state.get('imported', 0), 'message': self.state['message'], 'last_check': self.state.get('last_check'), 'ready_at': self.state.get('ready_at'), 'interval_minutes': INTERVAL // 60, 'request_count': self.state.get('requests', 0), 'budget_reserved_usd': self.state.get('reserved_units', 0) / 1000, 'budget_limit_usd': BUDGET_UNITS / 1000, 'username': self.state.get('username'), 'callback_url': self.callback}

    def connect(self, client_id):
        if not isinstance(client_id, str) or not re.fullmatch(r'[A-Za-z0-9_\-=:]{10,256}', client_id):
            raise SyncError('Enter the OAuth 2.0 Client ID from the Native App settings, not a bearer token.')
        with self.lock:
            self.state['enabled'] = False
            verifier = secrets.token_urlsafe(48)
            nonce = secrets.token_urlsafe(32)
            self.pending = {'client_id': client_id, 'verifier': verifier, 'state': nonce, 'expires': time.time() + 600}
            self.persist()
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
            return 'https://x.com/i/oauth2/authorize?' + urllib.parse.urlencode({'response_type': 'code', 'client_id': client_id, 'redirect_uri': self.callback, 'scope': SCOPES, 'state': nonce, 'code_challenge': challenge, 'code_challenge_method': 'S256'})

    def callback_result(self, query):
        with self.lock:
            pending = self.pending
            if not pending or time.time() > pending['expires'] or not hmac.compare_digest(query.get('state', ''), pending['state']):
                raise SyncError('Expired or invalid connection request. Start Connect again from the library.')
            self.pending = None
            if query.get('error') or not query.get('code'):
                raise SyncError('X connection was not approved. No bookmarks read.')
            token = request_json('/2/oauth2/token', form={'grant_type': 'authorization_code', 'code': query['code'], 'redirect_uri': self.callback, 'client_id': pending['client_id'], 'code_verifier': pending['verifier']})
            self.store_tokens(token, pending['client_id'])
            self.state['account_verified'] = False
            self.state.update(phase='connected' if not self.state.get('ready_at') else 'ready', enabled=False, message='Connected. Establish the exclusion baseline before saving new bookmarks.' if not self.state.get('ready_at') else 'Reconnected. Sync is paused.')
            self.persist()

    def store_tokens(self, token, client_id):
        scopes = set(token.get('scope', '').split())
        if not set(SCOPES.split()).issubset(scopes) or any(s.endswith('.write') for s in scopes) or not token.get('access_token'):
            raise SyncError('The granted read-only scopes were incomplete or unexpected. Reconnect with the requested permissions.')
        self.credentials = {'client_id': client_id, 'access_token': token['access_token'], 'refresh_token': token.get('refresh_token', self.credentials.get('refresh_token')), 'scope': token['scope'], 'expires_at': time.time() + int(token.get('expires_in', 7200))}
        save_json(self.credentials_path, self.credentials)

    def access_token(self):
        if not self.credentials.get('access_token'):
            raise SyncError('Connect your X account first.')
        if self.credentials['expires_at'] < time.time() + 60:
            if not self.credentials.get('refresh_token'):
                raise SyncError('X connection expired. Reconnect your account.')
            token = request_json('/2/oauth2/token', form={'grant_type': 'refresh_token', 'refresh_token': self.credentials['refresh_token'], 'client_id': self.credentials['client_id']})
            self.store_tokens(token, self.credentials['client_id'])
        return self.credentials['access_token']

    def get(self, path, units):
        token = self.access_token()
        # Reserve conservatively before attempting a request; no refunds on errors.
        if self.state.get('reserved_units', 0) + units > BUDGET_UNITS:
            raise SyncError('The $3 local test allowance is exhausted. Sync paused; review actual X charges before extending it.')
        self.state['reserved_units'] = self.state.get('reserved_units', 0) + units
        self.state['requests'] = self.state.get('requests', 0) + 1
        self.persist()
        return request_json(path, token=token)

    def identify(self):
        data = self.get('/2/users/me', 10).get('data', {})
        uid = data.get('id', '')
        if not re.fullmatch(r'\d{1,25}', uid):
            raise SyncError('Could not identify the connected X account.')
        if self.state.get('user_id') and self.state['user_id'] != uid:
            raise SyncError('This baseline belongs to another X account. Nothing imported.')
        self.state.update(user_id=uid, account_verified=True, username=str(data.get('username', ''))[:100])
        self.persist()

    def bookmark_page(self, size, pagination=None):
        params = {'max_results': size}
        if pagination:
            params['pagination_token'] = pagination
        return self.get('/2/users/' + self.state['user_id'] + '/bookmarks?' + urllib.parse.urlencode(params), size * 5)

    def baseline(self):
        with self.lock:
            if self.state.get('ready_at'):
                raise SyncError('A starting point already exists. It will not be reset or import old bookmarks.')
            self.state.update(enabled=False, phase='baselining')
            try:
                self.identify()
                ids, pagination, used_tokens = [], None, set()
                for _ in range(MAX_BASELINE_PAGES):
                    response = self.bookmark_page(100, pagination)
                    ids.extend(post_ids(response))
                    if len(ids) != len(set(ids)):
                        raise SyncError('Overlapping baseline pages. No bookmarks imported.')
                    # IDs only: discard old post text/media; never create captures here.
                    self.state['baseline_ids'] = list(dict.fromkeys(self.state.get('baseline_ids', []) + ids))
                    self.persist()
                    pagination = response.get('meta', {}).get('next_token')
                    if not pagination:
                        self.state.update(phase='ready', ready_at=time.time(), anchors=ids[:10], message='Starting point ready. Existing bookmarks excluded; new-bookmark sync is paused until enabled.')
                        self.persist()
                        return self.status()
                    if pagination in used_tokens:
                        raise SyncError('Repeated X pagination token. Baseline incomplete; no bookmarks imported.')
                    used_tokens.add(pagination)
                raise SyncError('More than 500 bookmarks were returned. Baseline incomplete; nothing imported. Review the next bounded baseline step before continuing.')
            except Exception as exc:
                self.pause_error(exc, 'baseline_incomplete')
                raise

    def pause_error(self, error, phase=None):
        self.state.update(enabled=False, message=str(error) if isinstance(error, SyncError) else 'Local sync failed. Paused without advancing the checkpoint.')
        if phase:
            self.state['phase'] = phase
        self.persist()

    def sync_once(self):
        with self.lock:
            if self.state.get('cloud_migrated'):
                raise SyncError('X checks moved to your cloud library. Local paid requests are disabled.')
            if self.state.get('phase') != 'ready' or not self.state.get('ready_at'):
                raise SyncError('A complete exclusion baseline is required first.')
            if time.time() - self.state.get('last_attempt', 0) < 60:
                raise SyncError('Please wait a minute between paid bookmark checks.')
            self.state['last_attempt'] = time.time()
            self.persist()
            try:
                if not self.state.get('account_verified'):
                    self.identify()
                ids, pagination, used_tokens = [], None, set()
                anchors = self.state.get('anchors', [])
                for _ in range(MAX_SYNC_PAGES):
                    response = self.bookmark_page(10, pagination)
                    ids.extend(post_ids(response))
                    pagination = response.get('meta', {}).get('next_token')
                    if any(i in anchors for i in ids) or not pagination:
                        break
                    if pagination in used_tokens:
                        raise SyncError('Repeated pagination. No checkpoint advanced.')
                    used_tokens.add(pagination)
                candidates = new_prefix(ids, anchors, set(self.state['baseline_ids']), set(self.state['seen_ids']))
                if not anchors and pagination:
                    raise SyncError('The empty starting point is no longer a complete window. Sync paused.')
                if len(candidates) > 20:
                    raise SyncError('More than 20 new bookmarks detected. Paused for a bounded catch-up test.')
                if candidates:
                    params = {'ids': ','.join(candidates), 'tweet.fields': 'text,author_id,created_at,attachments', 'expansions': 'attachments.media_keys,author_id', 'media.fields': 'type,url,preview_image_url,variants,width,height,duration_ms', 'user.fields': 'name,username,profile_image_url'}
                    result = self.get('/2/tweets?' + urllib.parse.urlencode(params), len(candidates) * 15)
                    returned = post_ids(result)
                    if set(returned) != set(candidates):
                        raise SyncError('Some new posts were unavailable. Nothing imported; sync paused.')
                    self.import_posts(result)
                self.state['seen_ids'] = list(dict.fromkeys(self.state['seen_ids'] + candidates))
                self.state['anchors'] = ids[:10] if ids else anchors
                self.state.update(last_check=time.time(), message=f'Last check: {len(candidates)} new bookmark(s). Existing bookmarks remain excluded.')
                self.persist()
                return self.status()
            except Exception as exc:
                self.pause_error(exc)
                raise

    def import_posts(self, result):
        # Persist only explicitly new posts/media, never baseline contents.
        cache = read_json(self.media_path, {'http_status': 200, 'sample_post_ids': [], 'response': {'data': [], 'includes': {'media': []}}})
        posts = {p['id']: p for p in cache['response']['data']}
        posts.update({p['id']: p for p in result['data']})
        media = {m['media_key']: m for m in cache['response']['includes']['media']}
        media.update({m['media_key']: m for m in result.get('includes', {}).get('media', [])})
        cache.update(sample_post_ids=list(posts), finished_at=time.time())
        users_cache = {u['id']: u for u in cache['response']['includes'].get('users', [])}
        users_cache.update({u['id']: u for u in result.get('includes', {}).get('users', [])})
        cache['response'] = {'data': list(posts.values()), 'includes': {'media': list(media.values()), 'users': list(users_cache.values())}}
        save_json(self.media_path, cache)
        users = {u['id']: u for u in result.get('includes', {}).get('users', [])}
        for post in result['data']:
            user = users.get(post.get('author_id'), {})
            saved = self.store.import_bookmark(post, user)
            if saved:
                self.state['imported'] = self.state.get('imported', 0) + 1

    def control(self, action):
        with self.lock:
            if self.state.get('cloud_migrated'):
                raise SyncError('X checks moved to your cloud library. Manage them there to avoid duplicate requests.')
            if action == 'pause':
                self.state.update(enabled=False, message='Bookmark sync paused.')
            elif action == 'enable':
                if self.state.get('phase') != 'ready' or not self.credentials.get('access_token'):
                    raise SyncError('Connect and complete the exclusion baseline first.')
                self.state.update(enabled=True, next_check=time.time(), message='Bookmark sync enabled while this server runs. Checks every 15 minutes.')
            else:
                raise SyncError('Unknown bookmark action.')
            self.persist()
            return self.status()

    def start_worker(self):
        def run():
            while not self.stop_event.wait(5):
                with self.lock:
                    due = self.state.get('enabled') and time.time() >= self.state.get('next_check', 0)
                    if due:
                        self.state['next_check'] = time.time() + INTERVAL
                        self.persist()
                if due:
                    try:
                        self.sync_once()
                    except Exception:
                        pass  # sync_once records a safe message and pauses.
        self.worker = threading.Thread(target=run, daemon=True)
        self.worker.start()

    def close(self):
        self.stop_event.set()
        if hasattr(self, 'worker'):
            self.worker.join(timeout=30)
