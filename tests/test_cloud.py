"""Controlled cloud transport checks. Never calls Supabase or X."""
import json, tempfile, time, unittest, sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import Store
from cloud_sync import CloudSync, CloudError, read_json

UID='11111111-1111-1111-1111-111111111111'
CONFIG={'url':'https://project.supabase.co','publishable_key':'sb_publishable_test'}
class CloudTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.store=Store(Path(self.temp.name));self.cloud=CloudSync(self.store,8765,CONFIG)
        self.cloud.session={'user_id':UID,'email':'owner@example.com','access_token':'fake-access','refresh_token':'fake-refresh','expires_at':time.time()+3600,'enabled':True}
        self.calls=[]
        def transport(path,*args,**kwargs):self.calls.append((path,args,kwargs));return None
        self.mock=patch.object(self.cloud,'request',side_effect=transport);self.mock.start()
    def tearDown(self):self.mock.stop();self.store.db.close();self.temp.cleanup()
    def save(self,**extra):return self.store.save(dict(url='https://example.com/',title='Real field shape',**extra))['item']
    def test_fixture_and_private_assessments_not_uploaded(self):
        item=self.save();self.store.evaluate({'id':item['id'],'notes':'private note'})
        self.store.save({'url':'https://example.org','fixture':True})
        self.cloud.cycle();self.assertEqual(len(self.calls),1)
        payload=self.calls[0][1][1];self.assertEqual(payload['user_id'],UID)
        self.assertNotIn('notes',payload['record']);self.assertNotIn('fixture',payload['record'])
    def test_unchanged_collection_does_not_make_network_requests(self):
        self.save();self.cloud.cycle();self.cloud.cycle();self.assertEqual(len(self.calls),1)
        self.assertEqual(self.cloud.status()['synced'],1)
    def test_failure_keeps_save_pending_across_restart(self):
        self.save();self.cloud.request.side_effect=CloudError('offline')
        self.cloud.cycle();self.assertEqual(self.cloud.status()['pending'],1)
        again=CloudSync(self.store,8765,CONFIG);self.assertEqual(again.status()['pending'],1)
        self.assertEqual(len(self.store.all()),1)
        again.session=self.cloud.session
        with patch.object(again,'request') as request:again.cycle();request.assert_not_called() # backoff persisted
        again.reset_retry()
        with patch.object(again,'request') as request:again.cycle();self.assertEqual(request.call_count,1)
        self.assertEqual(again.status()['pending'],0)
    def test_preview_failure_does_not_acknowledge_record(self):
        import base64
        self.save(preview_data_url='data:image/jpeg;base64,'+base64.b64encode(b'\xff\xd8\xffTEST').decode())
        self.cloud.request.side_effect=CloudError('offline')
        self.cloud.cycle();self.assertEqual(self.cloud.request.call_count,1);self.assertEqual(self.cloud.status()['pending'],1)
    def test_recapture_requeues_once(self):
        self.save();self.cloud.cycle();self.save(description='New description');self.cloud.cycle()
        self.assertEqual(len(self.calls),2);self.assertEqual(self.cloud.status()['synced'],1)
    def test_imported_x_bookmark_enters_same_delivery_path(self):
        self.assertTrue(self.store.import_bookmark({'id':'987654321','text':'A new motion reference'}, {'name':'Author','username':'author'}))
        with patch('cloud_sync.motion_manifest',return_value={'987654321':{'url':'https://video.twimg.com/test.mp4','width':100,'height':100}}):self.cloud.cycle()
        self.assertEqual(len(self.calls),1)
        payload=self.calls[0][1][1]
        self.assertEqual(payload['record']['post_id'],'987654321');self.assertEqual(payload['record']['kind'],'x_post')
        self.assertEqual(payload['motion']['width'],100)
    def test_later_media_enrichment_is_uploaded(self):
        self.store.save({'url':'https://x.com/a/status/123'})
        self.cloud.cycle()
        with patch('cloud_sync.motion_manifest',return_value={'123':{'url':'https://video.twimg.com/test.mp4','width':100,'height':100}}):self.cloud.cycle()
        self.assertEqual(len(self.calls),2);self.assertIsNotNone(self.calls[-1][1][1]['motion'])
    def test_mutation_during_upload_not_lost(self):
        self.save()
        def change(*a,**k):self.save(description='Saved while uploading')
        self.cloud.request.side_effect=change;self.cloud.cycle()
        self.cloud.reconcile(self.cloud.snapshots());self.assertEqual(self.cloud.status()['pending'],1)
    def test_local_delete_cancels_queue_without_cloud_delete(self):
        item=self.save();self.cloud.reconcile(self.cloud.snapshots());self.store.delete(item['id']);self.cloud.cycle()
        self.assertEqual(self.cloud.status()['pending'],0);self.assertEqual(self.calls,[])
    def test_pause_and_auth_failure_fail_closed(self):
        self.save();self.cloud.control('pause');self.cloud.cycle();self.assertEqual(self.calls,[])
        self.cloud.control('resume');self.cloud.request.side_effect=CloudError('denied',401);self.cloud.cycle()
        self.assertTrue(self.cloud.status()['needs_sign_in']);self.assertFalse(self.cloud.status()['enabled'])
        self.cloud.cycle();self.assertEqual(self.cloud.request.call_count,1)
    def test_pkce_callback_rejects_missing_and_expired_pending(self):
        for pending in [None,{'created':time.time()-601}]:
            self.cloud.pending=pending
            with self.assertRaises(CloudError):self.cloud.callback({'code':'code'})
        self.assertEqual(self.calls,[])
    def test_pkce_starts_existing_user_flow_without_exposing_verifier(self):
        status=self.cloud.connect('owner@example.com')
        body=self.calls[0][1][1];self.assertFalse(body['create_user']);self.assertEqual(body['code_challenge_method'],'s256')
        self.assertNotIn(self.cloud.pending['verifier'],json.dumps(status))
        self.assertNotIn('fake-access',json.dumps(status))
    def test_refresh_retains_owner_and_private_file_permissions(self):
        user={'id':UID,'email':'owner@example.com','email_confirmed_at':'date'}
        self.cloud.request.side_effect=lambda *a,**k:user
        self.cloud.accept_token({'access_token':'new','refresh_token':'new-refresh','expires_in':3600},'owner@example.com')
        self.assertEqual(self.cloud.path.stat().st_mode & 0o777,0o600)
        self.assertEqual(read_json(self.cloud.path)['refresh_token'],'new-refresh')
        self.cloud.request.side_effect=lambda *a,**k:dict(user,id='22222222-2222-2222-2222-222222222222')
        with self.assertRaises(CloudError):self.cloud.accept_token({'access_token':'other','refresh_token':'other'},'owner@example.com')
        self.assertEqual(read_json(self.cloud.path)['access_token'],'new')
    def test_status_never_contains_credentials_or_email(self):
        encoded=json.dumps(self.cloud.status());self.assertNotIn('fake-',encoded);self.assertNotIn('owner@example',encoded)
    def test_cloud_handoff_blocks_legacy_writes_and_survives_session_refresh(self):
        self.save();self.cloud.session['cloud_migrated']=True
        with self.assertRaises(CloudError):self.cloud.control('resume')
        self.cloud.cycle();self.assertEqual(self.calls,[])
        self.cloud.request.side_effect=lambda *a,**k:{'id':UID,'email':'owner@example.com','email_confirmed_at':'date'}
        self.cloud.accept_token({'access_token':'rotated','refresh_token':'rotated-refresh'},'owner@example.com')
        self.assertTrue(self.cloud.session['cloud_migrated'])
