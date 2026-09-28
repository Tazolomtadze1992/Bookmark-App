"""One-way, owner-authenticated cloud delivery. No paid X calls or service keys."""
import base64
import hashlib
import json
import os
import re
import secrets
import threading
import time
import uuid
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from x_media import motion_manifest, image_manifest, metadata_manifest

DISPLAY_FIELDS = ('id','url','normalised_url','post_id','kind','title','description',
                  'author_observed','created_at','updated_at','has_preview')

class CloudError(ValueError):
    def __init__(self, message, status=0):
        super().__init__(message)
        self.status = status

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # Never forward a user's authorization to another host.

def atomic_json(path, value):
    temporary = path.with_suffix('.tmp')
    fd = os.open(temporary, os.O_CREAT | os.O_TRUNC | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as file:
        json.dump(value, file)
        file.flush()
        os.fsync(file.fileno())
    temporary.chmod(0o600)
    os.replace(temporary, path)

def read_json(path):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, ValueError):
        return {}

class CloudSync:
    def __init__(self, store, port, config=None):
        self.store, self.port = store, port
        self.config = config or read_json(Path(__file__).with_name('cloud-config.json'))
        self.url = self.config.get('url', '')
        self.key = self.config.get('publishable_key', '')
        self.configured = bool(re.fullmatch(r'https://[a-z0-9]+\.supabase\.co', self.url)
                               and self.key.startswith('sb_publishable_'))
        self.path = store.directory / 'cloud-session.json'
        self.session = read_json(self.path)
        self.pending = None
        self.lock = threading.RLock()
        self.stop = threading.Event()
        self.message = ('Automatic cloud saves enabled.' if self.session.get('enabled') else 'Automatic cloud saves paused.') if self.session.get('user_id') else 'Connect this Mac to enable automatic cloud saves.'
        self.auth_error = False
        with store.lock:
            store.db.execute('''CREATE TABLE IF NOT EXISTS cloud_delivery (
                id TEXT PRIMARY KEY, desired TEXT NOT NULL, delivered TEXT,
                attempts INTEGER NOT NULL DEFAULT 0, next_try REAL NOT NULL DEFAULT 0,
                last_success REAL)''')
            store.db.commit()

    def request(self, path, method='GET', body=None, access=None, headers=None, binary=False):
        if not self.configured:
            raise CloudError('Cloud project is not configured.')
        h = {'apikey': self.key}
        if access:
            h['Authorization'] = 'Bearer ' + access
        if headers:
            h.update(headers)
        if body is not None and not binary:
            body = json.dumps(body).encode()
            h['Content-Type'] = 'application/json'
        try:
            with build_opener(NoRedirect()).open(Request(self.url + path, data=body, headers=h, method=method), timeout=20) as response:
                payload = response.read(8_000_000)
                return json.loads(payload) if payload else None
        except HTTPError as exc:
            # Do not log response bodies, request URLs, session tokens or private records.
            raise CloudError('Cloud request was rejected (HTTP %s).' % exc.code, exc.code) from None
        except (URLError, TimeoutError, OSError, ValueError):
            raise CloudError('Cloud connection unavailable; saved locally and will retry.') from None

    def connect(self, email):
        if not isinstance(email, str) or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) or len(email)>254:
            raise CloudError('Enter your cloud library email.')
        with self.lock:
            email = email.strip().lower()
            if self.session.get('email') and email != self.session['email']:
                raise CloudError('Use the same account already connected to this Mac.')
            if self.pending and time.time() < self.pending['created'] + 60:
                raise CloudError('Check your email, or wait a minute before requesting another link.')
            verifier = secrets.token_urlsafe(48)
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
            callback = f'http://127.0.0.1:{self.port}/oauth/supabase/callback'
            self.request('/auth/v1/otp?' + urlencode({'redirect_to':callback}), 'POST', {
                'email':email, 'create_user':False, 'code_challenge':challenge, 'code_challenge_method':'s256'})
            self.pending = {'email':email, 'verifier':verifier, 'created':time.time()}
            self.message = 'Open the new email sign-in link on this Mac to connect automatic saves.'
            return self.status()

    def accept_token(self, result, email=None):
        if not isinstance(result, dict) or not result.get('access_token') or not result.get('refresh_token'):
            raise CloudError('Cloud sign-in returned no usable session.')
        user = self.request('/auth/v1/user', access=result['access_token'])
        try:
            uid = str(uuid.UUID(user['id']))
        except (ValueError, TypeError, KeyError):
            raise CloudError('Cloud account could not be verified.') from None
        user_email = str(user.get('email', '')).lower()
        if not user.get('email_confirmed_at') or (email and user_email != email):
            raise CloudError('Sign in with the confirmed library account.')
        if self.session.get('user_id') and self.session['user_id'] != uid:
            raise CloudError('This Mac is linked to a different cloud account.')
        enabled = self.session.get('enabled', True)
        self.session = {'access_token':result['access_token'], 'refresh_token':result['refresh_token'],
                        'expires_at':time.time()+int(result.get('expires_in', 3600)),
                        'user_id':uid, 'email':user_email, 'enabled':enabled,
                        'cloud_migrated':bool(self.session.get('cloud_migrated'))}
        atomic_json(self.path, self.session)
        self.auth_error = False

    def callback(self, query):
        with self.lock:
            pending = self.pending
            if not pending or time.time()-pending['created']>600 or not query.get('code') or len(query['code'])>2048:
                raise CloudError('This sign-in link has expired. Connect again from the local library.')
            result = self.request('/auth/v1/token?grant_type=pkce', 'POST',
                                  {'auth_code':query['code'], 'code_verifier':pending['verifier']})
            self.accept_token(result, pending['email'])
            self.pending = None
            self.session['enabled'] = True
            atomic_json(self.path, self.session)
            self.message = 'Cloud connected. Local references will upload automatically.'
            self.reset_retry()

    def access(self):
        if time.time() >= self.session.get('expires_at', 0)-60:
            result = self.request('/auth/v1/token?grant_type=refresh_token', 'POST',
                                  {'refresh_token':self.session['refresh_token']})
            self.accept_token(result, self.session['email'])
        return self.session['access_token']

    def snapshots(self):
        motion, posters, metadata = {}, {}, {}
        for filename in ('x-probe.json','bookmark-media.json'):
            path = self.store.directory / filename
            motion.update(motion_manifest(path)); posters.update(image_manifest(path)); metadata.update(metadata_manifest(path))
        with self.store.lock:
            rows = self.store.db.execute('SELECT record,image FROM captures').fetchall()
        result = {}
        for raw, image in rows:
            item = json.loads(raw)
            if item.get('fixture'):
                continue
            pid = item.get('post_id')
            payload = {'id':item['id'], 'record':{k:item.get(k) for k in DISPLAY_FIELDS},
                       'saved_at':item['updated_at'], 'motion':motion.get(pid),
                       'poster':posters.get(pid), 'metadata':metadata.get(pid,{})}
            digest = hashlib.sha256(json.dumps(payload,sort_keys=True).encode()+(image or b'')).hexdigest()
            result[item['id']] = (payload, image, digest)
        return result

    def reconcile(self, snapshots):
        with self.store.lock:
            for item_id, (_, _, digest) in snapshots.items():
                self.store.db.execute('''INSERT INTO cloud_delivery (id,desired) VALUES (?,?)
                    ON CONFLICT(id) DO UPDATE SET desired=excluded.desired,attempts=0,next_try=0
                    WHERE cloud_delivery.desired!=excluded.desired''', (item_id,digest))
            # Local deletion cancels pending delivery but does not delete cloud copies.
            for (item_id,) in self.store.db.execute('SELECT id FROM cloud_delivery').fetchall():
                if item_id not in snapshots:
                    self.store.db.execute('DELETE FROM cloud_delivery WHERE id=?',(item_id,))
            self.store.db.commit()

    def reset_retry(self):
        with self.store.lock:
            self.store.db.execute('UPDATE cloud_delivery SET next_try=0,attempts=0')
            self.store.db.commit()

    def control(self, action):
        with self.lock:
            if self.session.get('cloud_migrated'):
                raise CloudError('Saving moved to the cloud extension. Local delivery is disabled to preserve cloud changes.')
            if action not in ('pause','resume','retry') or not self.session.get('user_id'):
                raise CloudError('Connect your cloud account first.')
            if self.auth_error:
                raise CloudError('Sign in again to reconnect cloud saves.')
            self.session['enabled'] = action != 'pause'
            atomic_json(self.path, self.session)
            if action == 'retry': self.reset_retry()
            self.message = 'Automatic cloud saves paused.' if action=='pause' else 'Automatic cloud saves enabled.'
            return self.status()

    def status(self):
        with self.store.lock:
            pending, synced, last = self.store.db.execute('''SELECT
                coalesce(sum(delivered IS NULL OR desired!=delivered),0),
                coalesce(sum(desired=delivered),0),max(last_success) FROM cloud_delivery''').fetchone()
        return {'configured':self.configured, 'connected':bool(self.session.get('user_id')),
                'enabled':bool(self.session.get('enabled')) and not self.auth_error,
                'needs_sign_in':self.auth_error, 'pending':pending, 'synced':synced,
                'last_success':last, 'message':self.message}

    def cycle(self):
        with self.lock:
            if self.session.get('cloud_migrated'):
                return
            snapshots = self.snapshots()
            self.reconcile(snapshots)
            if not self.session.get('enabled') or self.auth_error:
                return
            with self.store.lock:
                due = self.store.db.execute('''SELECT id,attempts FROM cloud_delivery
                    WHERE (delivered IS NULL OR desired!=delivered) AND next_try<=? LIMIT 5''',(time.time(),)).fetchall()
            for item_id, attempts in due:
                if self.stop.is_set(): break
                payload, image, digest = snapshots[item_id]
                try:
                    access = self.access()
                    uid = self.session['user_id']
                    if image:
                        self.request('/storage/v1/object/previews/'+uid+'/'+item_id+'.jpg', 'POST', image, access,
                                     {'Content-Type':'image/jpeg','x-upsert':'true'}, binary=True)
                    self.request('/rest/v1/library_references?on_conflict=user_id,id', 'POST',
                                 dict(payload,user_id=uid), access, {'Prefer':'resolution=merge-duplicates,return=minimal'})
                    with self.store.lock:
                        self.store.db.execute('UPDATE cloud_delivery SET delivered=?,attempts=0,next_try=0,last_success=? WHERE id=?',
                                              (digest,time.time(),item_id)); self.store.db.commit()
                    self.message = 'Saved to your private cloud library.'
                except CloudError as exc:
                    with self.store.lock:
                        self.store.db.execute('UPDATE cloud_delivery SET attempts=?,next_try=? WHERE id=?',
                                              (attempts+1,time.time()+min(900,10*2**min(attempts,7)),item_id)); self.store.db.commit()
                    self.message = str(exc)
                    if exc.status in (400,401,403):
                        # Fail closed on authorization/configuration errors; do not retry aggressively.
                        self.auth_error = True
                        self.message = 'Cloud access needs attention. Sign in again; local saves are safe.'
                    break

    def start_worker(self):
        def run():
            while not self.stop.wait(5):
                try: self.cycle()
                except Exception:
                    self.message = 'Cloud delivery paused by a local error; references remain saved on this Mac.'
        self.worker = threading.Thread(target=run, daemon=True)
        self.worker.start()

    def close(self):
        self.stop.set()
        if hasattr(self,'worker'): self.worker.join(timeout=65)
