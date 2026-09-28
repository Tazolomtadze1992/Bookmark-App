import json
import tempfile
import unittest
from pathlib import Path
from server import Store
from x_media import metadata_manifest

class LibraryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.path=Path(self.temp.name);self.store=Store(self.path)
    def tearDown(self):
        self.store.db.close();self.temp.cleanup()
    def test_organisation_survives_recapture_and_reopen_without_changing_dates(self):
        item=self.store.save({'url':'https://x.com/author/status/123','title':'Original'})['item']
        changed=self.store.organise({'id':item['id'],'favorite':True,'categories':['Motion','Branding','Motion']})
        self.assertEqual(changed['created_at'],item['created_at']);self.assertEqual(changed['updated_at'],item['updated_at'])
        self.store.save({'url':item['url'],'title':'Recaptured'})
        self.store.db.close();self.store=Store(self.path)
        found=self.store.all()[0]
        self.assertEqual(found['library'],{'favorite':True,'categories':['Motion','Branding']});self.assertEqual(found['title'],'Recaptured')
    def test_bad_updates_are_atomic(self):
        item=self.store.save({'url':'https://example.com'})['item']
        for update in [{'favorite':1},{'categories':'Motion'},{'favorite':True,'categories':['arbitrary']},{'categories':[{}]}]:
            with self.assertRaises(ValueError):self.store.organise({'id':item['id'],**update})
        self.assertFalse(self.store.all()[0]['library']['favorite'])
    def test_unknown_id_cannot_create_capture(self):
        with self.assertRaises(ValueError):self.store.organise({'id':'a'*32,'favorite':True})
        self.assertEqual(self.store.all(),[])
    def test_metadata_is_bounded_to_saved_ids_and_safe_avatar_origin(self):
        path=self.path/'report.json'
        report={'http_status':200,'sample_post_ids':['1'],'response':{'data':[{'id':'1','author_id':'u','text':'Real text'},{'id':'2','text':'Not saved'}],'includes':{'users':[{'id':'u','name':'Author','username':'author','profile_image_url':'https://pbs.twimg.com/avatar.jpg'}]}}}
        path.write_text(json.dumps(report));self.assertEqual(set(metadata_manifest(path)),{'1'});self.assertEqual(metadata_manifest(path)['1']['avatar'],'https://pbs.twimg.com/avatar.jpg')
        for url in ['javascript:alert(1)','https://evil.example/avatar.jpg','https://pbs.twimg.com@evil.example/avatar','https://pbs.twimg.com:444/avatar']:
            report['response']['includes']['users'][0]['profile_image_url']=url;path.write_text(json.dumps(report));self.assertEqual(metadata_manifest(path)['1']['avatar'],'')
