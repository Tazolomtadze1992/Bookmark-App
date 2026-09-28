"""Offline regression checks. Run: python3 -m unittest discover -s tests -v"""
import base64
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Store, CaptureServer, normalise_url
from x_probe import build_url

# Minimal controlled JPEG header for storage validation; not a browser image fixture.
JPEG = 'data:image/jpeg;base64,' + base64.b64encode(b'\xff\xd8\xff\xe0CONTROLLED_TEST\xff\xd9').decode()

class URLTests(unittest.TestCase):
    def test_tracking_removal_retains_meaningful_data(self):
        url, pid = normalise_url('https://example.com/work?utm_source=x&project=3#motion')
        self.assertEqual(url, 'https://example.com/work?project=3#motion'); self.assertIsNone(pid)
    def test_x_identity_retained_as_string(self):
        url,pid=normalise_url('https://x.com/radbar_1/status/2102832558899941678?s=20')
        self.assertEqual(pid,'2102832558899941678');self.assertEqual(url,'https://x.com/i/status/'+pid)
    def test_twitter_alias_deduplicates(self):
        self.assertEqual(normalise_url('https://twitter.com/a/status/123'),normalise_url('https://x.com/b/status/123'))
    def test_unsafe_urls_rejected(self):
        for url in ['file:///etc/passwd','javascript:alert(1)','https://user:secret@example.com','not a url','https://x.com/home']:
            with self.subTest(url=url),self.assertRaises(ValueError): normalise_url(url)
    def test_query_order_preserved_conservatively(self):
        self.assertEqual(normalise_url('https://example.com/?a=2&a=1')[0],'https://example.com/?a=2&a=1')

class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.store=Store(Path(self.temp.name))
    def tearDown(self):self.store.db.close();self.temp.cleanup()
    def test_source_saved_without_preview(self):
        item=self.store.save({'url':'https://example.com/'})['item']
        self.assertFalse(item['has_preview']);self.assertEqual(item['preview_status'],'missing');self.assertIsNone(item['recognisable'])
    def test_duplicate_updates_single_record(self):
        self.store.save({'url':'https://example.com/?utm_source=x','preview_data_url':JPEG})
        second=self.store.save({'url':'https://example.com/'})
        self.assertTrue(second['duplicate']);self.assertEqual(len(self.store.all()),1)
        self.assertTrue(second['item']['has_preview']);self.assertEqual(second['item']['capture_attempts'],2)
    def test_playback_not_inferred_from_screenshot(self):
        item=self.store.save({'url':'https://x.com/a/status/123','preview_data_url':JPEG})['item']
        self.assertEqual(item['playback'],'not_tested');self.assertIsNone(item['cost']['measured_product_cost_usd'])
    def test_malformed_preview_rejected(self):
        with self.assertRaises(ValueError):self.store.save({'url':'https://example.com','preview_data_url':'data:image/jpeg;base64,!!!'})
    def test_assessment_is_explicit(self):
        i=self.store.save({'url':'https://x.com/a/status/123'})['item']
        result=self.store.evaluate({'id':i['id'],'recognisable':False,'playback':'source_only'})
        self.assertFalse(result['recognisable']);self.assertEqual(result['playback'],'source_only')
    def test_bad_assessment_rejected(self):
        i=self.store.save({'url':'https://example.com'})['item']
        with self.assertRaises(ValueError):self.store.evaluate({'id':i['id'],'playback':'everything_worked'})
    def test_delete_removes_preview(self):
        i=self.store.save({'url':'https://example.com','preview_data_url':JPEG})['item'];self.store.delete(i['id'])
        self.assertEqual(self.store.all(),[]);self.assertIsNone(self.store.image(i['id']))

class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory();cls.store=Store(Path(cls.temp.name));cls.token='test-token-not-a-real-secret'
        cls.server=CaptureServer(('127.0.0.1',0),cls.store,cls.token,[])
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.base=f'http://127.0.0.1:{cls.server.server_address[1]}'
    @classmethod
    def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.store.db.close();cls.temp.cleanup()
    def request(self,path,method='GET',body=None,token=True,extra=None):
        headers={'X-Capture-Token':self.token} if token else {}
        if extra:headers.update(extra)
        if body is not None:headers['Content-Type']='application/json'
        req=urllib.request.Request(self.base+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
        try:
            with urllib.request.urlopen(req,timeout=3) as r:return r.status,r.read(),r.headers
        except urllib.error.HTTPError as e:return e.code,e.read(),e.headers
    def test_probe_requires_local_origin_and_explicit_confirmation(self):
        from unittest.mock import patch
        with patch('x_probe.execute_lookup') as lookup:
            self.assertEqual(self.request('/api/x-probe','POST',{'confirm_five_posts':True})[0],403)
            self.assertEqual(self.request('/api/x-probe','POST',{},extra={'Origin':self.base})[0],403)
            lookup.assert_not_called()
    def test_state_does_not_trigger_lookup(self):
        from unittest.mock import patch
        with patch('x_probe.execute_lookup') as lookup:
            status,body,_=self.request('/api/state')
            self.assertEqual(status,200);self.assertEqual(json.loads(body)['motion'],{})
            lookup.assert_not_called()
    def test_bookmark_controls_require_browser_origin(self):
        from unittest.mock import patch
        with patch.object(self.server.bookmarks, 'baseline') as action:
            self.assertEqual(self.request('/api/bookmarks/baseline','POST',{'confirm':True})[0],403)
            action.assert_not_called()
    def test_bookmark_controls_require_explicit_confirmation(self):
        from unittest.mock import patch
        with patch.object(self.server.bookmarks, 'baseline') as action:
            self.assertEqual(self.request('/api/bookmarks/baseline','POST',{},extra={'Origin':self.base})[0],400)
            action.assert_not_called()
    def test_invalid_oauth_callback_never_exchanges_token(self):
        from unittest.mock import patch
        with patch('bookmark_sync.request_json') as action:
            self.assertEqual(self.request('/oauth/x/callback?state=invalid&code=controlled',token=False)[0],400)
            action.assert_not_called()
    def test_local_state_does_not_read_bookmarks(self):
        from unittest.mock import patch
        with patch('bookmark_sync.request_json') as action:
            status,body,_=self.request('/api/state')
            self.assertEqual(status,200);self.assertFalse(json.loads(body)['bookmarks']['connected'])
            action.assert_not_called()
    def test_unauthenticated_read_is_denied(self):self.assertEqual(self.request('/api/state',token=False)[0],401)
    def test_authenticated_save_and_read(self):
        self.assertEqual(self.request('/api/captures','POST',{'url':'https://example.org/'})[0],200)
        self.assertEqual(self.request('/api/state')[0],200)
    def test_cross_site_origin_is_denied(self):
        self.assertEqual(self.request('/api/captures','POST',{'url':'https://example.org/'},extra={'Origin':'https://evil.example'})[0],403)
    def test_dns_rebinding_host_is_denied(self):self.assertEqual(self.request('/api/state',extra={'Host':'evil.example'})[0],403)
    def test_widget_origin_cannot_read_private_state(self):
        host=f'localhost:{self.server.server_address[1]}'
        self.assertEqual(self.request('/api/state',extra={'Host':host})[0],403)
        self.assertEqual(self.request('/',extra={'Host':host})[0],403)
    def test_widget_page_does_not_contain_local_token(self):
        host=f'localhost:{self.server.server_address[1]}'
        status,body,_=self.request('/embed/123',token=False,extra={'Host':host})
        self.assertEqual(status,200);self.assertNotIn(self.token.encode(),body)
    def test_path_traversal_not_served(self):self.assertNotEqual(self.request('/../server.py')[0],200)
    def test_response_sets_no_store_and_frame_protection(self):
        _,_,headers=self.request('/api/state');self.assertEqual(headers['Cache-Control'],'no-store');self.assertEqual(headers['X-Frame-Options'],'DENY')

class ProbeTests(unittest.TestCase):
    def test_fixed_official_endpoint_and_ids(self):
        sources=[{'kind':'x_post','post_id':'2103762749759037822'}]
        url=build_url(sources);self.assertTrue(url.startswith('https://api.x.com/2/tweets?'));self.assertIn('2103762749759037822',url)
    def test_no_numeric_id_precision_loss(self):
        with self.assertRaises(ValueError):build_url([{'kind':'x_post','post_id':2103762749759037822}])
    def test_basic_omits_extra_resources(self):
        url=build_url([{'kind':'x_post','post_id':'123'}],True);self.assertNotIn('expansions',url)

if __name__=='__main__':unittest.main()
