"""Controlled media/probe checks, not live X evidence."""
import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from x_media import motion_manifest
from x_probe import execute_lookup

class MotionTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.path=Path(self.temp.name)/'probe.json'
 def tearDown(self):self.temp.cleanup()
 def report(self,url='https://video.twimg.com/sample.mp4'):
  r={'http_status':200,'sample_post_ids':['123'],'response':{'data':[{'id':'123','attachments':{'media_keys':['primary']},'referenced_tweets':[{'id':'456'}]}],'includes':{'media':[{'media_key':'primary','type':'video','width':720,'height':900,'variants':[{'content_type':'video/mp4','url':url,'bit_rate':640000}]},{'media_key':'quoted','type':'video','width':1280,'height':720,'variants':[{'content_type':'video/mp4','url':'https://video.twimg.com/quoted.mp4'}]}]}}}
  self.path.write_text(json.dumps(r));return r
 def test_no_report_has_no_native_media(self):self.assertEqual(motion_manifest(self.path),{})
 def test_primary_only_and_intrinsic_dimensions(self):
  self.report();m=motion_manifest(self.path);self.assertEqual(list(m),['123']);self.assertEqual((m['123']['width'],m['123']['height']),(720,900));self.assertNotIn('quoted',m['123']['url'])
 def test_untrusted_media_destinations_rejected(self):
  for url in ['http://video.twimg.com/a.mp4','https://evil.example/a.mp4','https://video.twimg.com.evil.example/a.mp4','https://u:p@video.twimg.com/a.mp4','https://video.twimg.com:8443/a.mp4']:
   self.report(url);self.assertEqual(motion_manifest(self.path),{})
 def test_failed_lookup_not_used(self):
  r=self.report();r['http_status']=403;self.path.write_text(json.dumps(r));self.assertEqual(motion_manifest(self.path),{})
 def test_existing_report_prevents_second_request(self):
  self.report()
  with patch('urllib.request.build_opener') as network:
   with self.assertRaises(ValueError):execute_lookup('controlled-fake-token',[{'kind':'x_post','post_id':'123'}],self.path)
   network.assert_not_called()
 def test_invalid_token_prevents_request(self):
  with patch('urllib.request.build_opener') as network:
   with self.assertRaises(ValueError):execute_lookup(None,[{'kind':'x_post','post_id':'123'}],self.path)
   network.assert_not_called()

 def test_preview_chooses_sharp_variant_without_4k_bandwidth(self):
  r=self.report();media=r['response']['includes']['media'][0]
  media['variants']=[{'content_type':'video/mp4','url':f'https://video.twimg.com/{rate}.mp4','bit_rate':rate} for rate in [25128000,632000,10368000,2176000]]
  self.path.write_text(json.dumps(r))
  self.assertTrue(motion_manifest(self.path)['123']['url'].endswith('/10368000.mp4'))
 def test_only_high_bitrate_variants_use_lightest_available(self):
  r=self.report();r['response']['includes']['media'][0]['variants']=[{'content_type':'video/mp4','url':f'https://video.twimg.com/{rate}.mp4','bit_rate':rate} for rate in [25000000,15000000]]
  self.path.write_text(json.dumps(r))
  self.assertTrue(motion_manifest(self.path)['123']['url'].endswith('/15000000.mp4'))
 def test_single_gif_variant_without_bitrate_is_preserved(self):
  r=self.report();m=r['response']['includes']['media'][0];m['type']='animated_gif';m['variants'][0].pop('bit_rate')
  self.path.write_text(json.dumps(r));self.assertEqual(motion_manifest(self.path)['123']['url'],'https://video.twimg.com/sample.mp4')
