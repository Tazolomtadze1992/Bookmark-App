"""Controlled bookmark/OAuth cases. No real X reads or account permissions."""
import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit, parse_qs
from server import Store
from bookmark_sync import BookmarkSync, SyncError, new_prefix, BUDGET_UNITS


def page(ids, next_token=None):
    return {'data': [{'id': i, 'text': 'CONTROLLED'} for i in ids], 'meta': {'next_token': next_token} if next_token else {}}


class BookmarkTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.store=Store(self.root);self.sync=BookmarkSync(self.root,self.store,8765)
        self.sync.credentials={'access_token':'controlled-not-real','expires_at':time.time()+1000}
    def tearDown(self):
        self.store.db.close();self.temp.cleanup()
    def ready(self, old=('100','90')):
        self.sync.state.update(phase='ready',ready_at=time.time(),baseline_ids=list(old),anchors=list(old),user_id='123',account_verified=True)
    def test_cloud_handoff_blocks_local_paid_checks(self):
        self.ready();self.sync.state["cloud_migrated"]=True
        with patch.object(self.sync,"get") as request:
            with self.assertRaises(SyncError):self.sync.control("enable")
            with self.assertRaises(SyncError):self.sync.sync_once()
            request.assert_not_called()
    def test_baseline_never_imports_and_only_keeps_ids(self):
        with patch.object(self.sync,'get',side_effect=[{'data':{'id':'123','username':'controlled'}}, page(['100','90'],'next'),page(['80'])]):
            self.sync.baseline()
        self.assertEqual(self.store.all(),[])
        self.assertEqual(self.sync.state['baseline_ids'],['100','90','80'])
        self.assertNotIn('CONTROLLED',self.sync.state_path.read_text())
        self.assertFalse(self.sync.state['enabled'])
    def test_incomplete_baseline_blocks_activation(self):
        with patch.object(self.sync,'get',side_effect=[{'data':{'id':'123'}},*[page([str(i)],str(i)) for i in range(5)]]):
            with self.assertRaises(SyncError):self.sync.baseline()
        with self.assertRaises(SyncError):self.sync.control('enable')
        self.assertEqual(self.store.all(),[])
    def test_old_published_post_can_be_new_bookmark(self):
        self.assertEqual(new_prefix(['1','100','90'],['100','90'],{'100','90'},set()),['1'])
    def test_old_bookmarks_never_import_even_if_moved_to_front(self):
        self.assertEqual(new_prefix(['80','1','100'],['100','90'],{'100','90','80'},set()),['1'])
    def test_old_tail_discovered_after_removal_is_not_imported(self):
        self.assertEqual(new_prefix(['90','70'],['100','90'],{'100','90'},set()),[])
    def test_missing_anchor_and_reordered_anchor_fail_closed(self):
        for ids in [['1','2'], ['90','1','100']]:
            with self.assertRaises(SyncError):new_prefix(ids,['100','90'],{'100','90'},set())
    def test_duplicate_pages_fail_closed(self):
        with self.assertRaises(SyncError):new_prefix(['1','1','100'],['100'],{'100'},set())
    def test_successful_new_save_has_media_and_dedup(self):
        self.ready()
        media={'media_key':'m','type':'video','width':1080,'height':1080,'variants':[]}
        result={'data':[{'id':'1','text':'New bookmark of an old post','author_id':'a','attachments':{'media_keys':['m']}}],'includes':{'users':[{'id':'a','name':'Author','username':'author'}],'media':[media]}}
        with patch.object(self.sync,'get',side_effect=[page(['1','100','90']),result]):self.sync.sync_once()
        self.assertEqual(len(self.store.all()),1);self.assertEqual(self.store.all()[0]['capture_origin'],'x_bookmark')
        self.assertEqual(json.loads(self.sync.media_path.read_text())['sample_post_ids'],['1'])
        self.sync.state['last_attempt']=0
        with patch.object(self.sync,'get',return_value=page(['1','100','90'])) as read:self.sync.sync_once()
        self.assertEqual(read.call_count,1);self.assertEqual(len(self.store.all()),1)
    def test_removed_local_card_is_not_reimported_on_next_check(self):
        self.ready();self.sync.state['seen_ids']=['1'];self.sync.state['anchors']=['1','100']
        with patch.object(self.sync,'get',return_value=page(['1','100'])) as read:self.sync.sync_once()
        self.assertEqual(self.store.all(),[]);self.assertEqual(read.call_count,1)
    def test_partial_result_does_not_advance_or_import(self):
        self.ready();before=self.sync.state['anchors'][:]
        with patch.object(self.sync,'get',side_effect=[page(['1','100']),{'errors':[{'detail':'controlled'}]}]):
            with self.assertRaises(SyncError):self.sync.sync_once()
        self.assertEqual(self.sync.state['anchors'],before);self.assertEqual(self.store.all(),[])
    def test_existing_capture_preserved(self):
        self.ready();item=self.store.save({'url':'https://x.com/i/status/1','title':'Existing'})['item']
        self.store.evaluate({'id':item['id'],'recognisable':True})
        self.sync.import_posts({'data':[{'id':'1','text':'Different'}]})
        saved=self.store.all()[0];self.assertEqual(saved['title'],'Existing');self.assertTrue(saved['recognisable'])
    def test_budget_prevents_network(self):
        self.sync.state['reserved_units']=BUDGET_UNITS
        with patch('bookmark_sync.request_json') as network:
            with self.assertRaises(SyncError):self.sync.get('/2/users/me',10)
            network.assert_not_called()
    def test_oauth_pkce_no_write_scopes_and_invalid_state_no_exchange(self):
        url=self.sync.connect('controlled_client_id')
        q=parse_qs(urlsplit(url).query)
        self.assertEqual(q['code_challenge_method'],['S256'])
        self.assertNotIn('.write',q['scope'][0]);self.assertIn('bookmark.read',q['scope'][0])
        with patch('bookmark_sync.request_json') as network:
            with self.assertRaises(SyncError):self.sync.callback_result({'state':'wrong','code':'fake'})
            network.assert_not_called()
        self.assertIsNotNone(self.sync.pending)
    def test_expired_oauth_state_no_exchange(self):
        self.sync.connect('controlled_client_id');self.sync.pending['expires']=0
        with patch('bookmark_sync.request_json') as network:
            with self.assertRaises(SyncError):self.sync.callback_result({'state':self.sync.pending['state'],'code':'fake'})
            network.assert_not_called()
    def test_status_does_not_expose_tokens_or_bookmark_ids(self):
        self.ready();s=json.dumps(self.sync.status())
        self.assertNotIn('controlled-not-real',s);self.assertNotIn('baseline_ids',s)
    def test_reconnected_account_mismatch_stops_before_bookmarks(self):
        self.ready();self.sync.state['account_verified']=False
        with patch.object(self.sync,'get',return_value={'data':{'id':'999'}}) as read:
            with self.assertRaises(SyncError):self.sync.sync_once()
            self.assertEqual(read.call_count,1)
        self.assertEqual(self.store.all(),[])
    def test_restart_is_paused_and_exclusions_preserved(self):
        self.ready();self.sync.state['enabled']=True;self.sync.persist()
        other=BookmarkSync(self.root,self.store,8765)
        self.assertFalse(other.state['enabled']);self.assertEqual(other.state['baseline_ids'],['100','90'])
