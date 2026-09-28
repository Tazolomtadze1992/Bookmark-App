"""Controlled browser test; never substitutes for the eight live references.

Optional test dependencies: Playwright, Chromium, Xvfb, X11/XTest (Linux).
The capture lab itself does not need these dependencies.
"""
from __future__ import annotations
import ctypes
import ctypes.util
import json
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import ROOT, Store, CaptureServer
from playwright.sync_api import sync_playwright

FIXTURE='''<!doctype html><html lang="en" data-capture-fixture="true"><head><title>Controlled capture fixture</title><meta name="description" content="A local page used only to test automatic capture."><style>body{margin:0;font:24px system-ui;background:#f7f6f2;color:#20201e}main{padding:64px}small{font-size:13px;letter-spacing:2px}h1{max-width:640px;font-size:64px;line-height:1.05;margin:32px 0}.blocks{display:flex;gap:24px}.block{width:200px;height:150px;background:#dedbd3;border:2px solid #777;display:grid;place-items:center}.b{border-radius:75px}.c{transform:rotate(-7deg);background:#aaa89d}</style></head><body><main><small>CONTROLLED FIXTURE · NOT A USER SOURCE</small><h1>A visible page, saved without preparation.</h1><p>Automatic screenshot + source + title.</p><div class="blocks"><div class="block">A</div><div class="block b">B</div><div class="block c">C</div></div></main></body></html>'''
X_FIXTURE='''<!doctype html><html data-capture-fixture="true"><head><title>Controlled X DOM fixture</title><style>body{font:18px system-ui;background:#eee;margin:40px}article{padding:24px;background:white;width:560px;margin:auto}video{width:500px;height:240px;background:#333}a{color:inherit}</style></head><body><article data-testid="tweet"><div data-testid="User-Name">Fixture Author @capture_fixture</div><a href="/capture_fixture/status/1234567890123456789"><time datetime="2026-09-28">Test timestamp</time></a><p data-testid="tweetText">CONTROLLED FIXTURE: a simulated X post. No real X content or playback is represented.</p><div data-testid="videoPlayer"><video></video></div></article></body></html>'''
class FixtureHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        data=FIXTURE.encode();self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def log_message(self,*args):pass

def hotkey():
    x=ctypes.CDLL(ctypes.util.find_library('X11'));t=ctypes.CDLL(ctypes.util.find_library('Xtst'))
    x.XOpenDisplay.restype=ctypes.c_void_p;x.XOpenDisplay.argtypes=[ctypes.c_char_p]
    x.XStringToKeysym.restype=ctypes.c_ulong;x.XStringToKeysym.argtypes=[ctypes.c_char_p]
    x.XKeysymToKeycode.restype=ctypes.c_uint;x.XKeysymToKeycode.argtypes=[ctypes.c_void_p,ctypes.c_ulong]
    x.XFlush.argtypes=[ctypes.c_void_p];x.XCloseDisplay.argtypes=[ctypes.c_void_p]
    t.XTestFakeKeyEvent.argtypes=[ctypes.c_void_p,ctypes.c_uint,ctypes.c_int,ctypes.c_ulong]
    display=x.XOpenDisplay(None)
    if not display:raise RuntimeError('X display missing')
    codes=[x.XKeysymToKeycode(display,x.XStringToKeysym(k)) for k in [b'Control_L',b'Shift_L',b'y']]
    for key in codes:t.XTestFakeKeyEvent(display,key,1,0)
    for key in reversed(codes):t.XTestFakeKeyEvent(display,key,0,0)
    x.XFlush(display);x.XCloseDisplay(display)

def wait_until(fn,timeout=12):
    end=time.monotonic()+timeout
    while time.monotonic()<end:
        if fn():return
        time.sleep(.15)
    raise AssertionError('Timed out waiting for condition')

def main():
    evidence=ROOT/'evidence';evidence.mkdir(exist_ok=True)
    records=[];config=ROOT/'extension/config.local.js';original=config.read_text()
    def passed(name,detail):records.append({'test':name,'status':'passed','detail':detail});print('PASS:',name,flush=True)
    with tempfile.TemporaryDirectory() as data,tempfile.TemporaryDirectory() as profile:
        store=Store(Path(data));token='controlled-smoke-test-token'
        sources=json.loads((ROOT/'sources.json').read_text())['sources']
        service=CaptureServer(('127.0.0.1',8765),store,token,sources)
        thread=threading.Thread(target=service.serve_forever,daemon=True);thread.start()
        fixture=ThreadingHTTPServer(('127.0.0.1',8876),FixtureHandler)
        threading.Thread(target=fixture.serve_forever,daemon=True).start()
        config.write_text('globalThis.CAPTURE_CONFIG = '+json.dumps({'base':'http://127.0.0.1:8765','token':token})+';\n')
        try:
            with sync_playwright() as p:
                context=p.chromium.launch_persistent_context(profile,executable_path='/usr/bin/chromium',headless=False,timeout=8000,viewport={'width':1360,'height':900},args=['--no-sandbox','--disable-dev-shm-usage','--window-size=1440,1050',f'--disable-extensions-except={ROOT / "extension"}',f'--load-extension={ROOT / "extension"}'])
                # Real external requests are not needed, and are blocked by test routing.
                xurl='https://x.com/capture_fixture/status/1234567890123456789'
                def route(req):
                    url=req.request.url
                    if url==xurl:return req.fulfill(status=200,content_type='text/html',body=X_FIXTURE)
                    if url.startswith(('http://127.0.0.1:','http://localhost:','chrome-extension://')):return req.continue_()
                    return req.abort()
                context.route('**/*',route)
                worker=context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
                page=context.new_page();page.goto('http://localhost:8876/');page.bring_to_front();page.wait_for_timeout(1200)
                page.screenshot(path=str(evidence/'controlled-source.png'))
                hotkey();wait_until(lambda:len(store.all())==1)
                item=store.all()[0]
                if not item['has_preview']:
                    raise AssertionError(json.dumps(item))
                assert item['title']=='Controlled capture fixture'
                assert item['preview_bytes']>5000
                assert item['fixture'] is True
                passed('Actual extension action on a controlled website','OS keyboard shortcut invoked Chrome action; URL, title and nonempty visible-tab JPEG persisted automatically.')
                image=store.image(item['id']);(evidence/'controlled-captured-preview.jpg').write_bytes(image)
                page.wait_for_timeout(1100);hotkey();wait_until(lambda:store.all()[0]['capture_attempts']==2)
                assert len(store.all())==1
                passed('Repeat save deduplication','A second invocation updates one item rather than creating another.')
                page.goto(xurl);page.bring_to_front();page.wait_for_timeout(1000);hotkey();wait_until(lambda:len(store.all())==2)
                xi=next(i for i in store.all() if i['kind']=='x_post')
                assert xi['has_preview'],json.dumps(xi)
                assert xi['author_observed']=='Fixture Author @capture_fixture'
                assert xi['playback']=='not_tested'
                assert xi['preview_method']=='visible_post_media_crop'
                passed('Exact-post targeting on a simulated X DOM','Target post and media crop recognised in a controlled fixture; no real X post, embed or video playback was validated.')
                (evidence/'controlled-x-crop.jpg').write_bytes(store.image(xi['id']))
                lab=context.new_page();lab.goto('http://127.0.0.1:8765/');lab.wait_for_selector('.card');lab.wait_for_timeout(700)
                assert lab.locator('.card').count()==2
                assert lab.locator('#progress').inner_text()=='0 / 8 sources saved'
                passed('No fabricated sample successes','Viewer keeps all eight user-supplied sources untested despite controlled fixtures passing.')
                img=lab.locator('.card img').first
                assert img.evaluate('(img)=>img.complete && img.naturalWidth>0')
                passed('Preview rendered in local viewer','Stored JPEG loads and renders, not just a successful HTTP status.')
                lab.locator('.card select').first.select_option('yes');lab.wait_for_timeout(400)
                assert any(i['recognisable'] is True for i in store.all())
                passed('Explicit assessment persistence','Optional recognisability judgement stored separately from capture completion.')
                lab.screenshot(path=str(evidence/'controlled-lab.png'),full_page=True)
                # Offline queue: no background polling. Disconnect local service, save a new URL,
                # reconnect, then invoke the same retry function wired to the context menu.
                service.shutdown();service.server_close();thread.join()
                page.goto('http://localhost:8876/offline');page.bring_to_front();page.wait_for_timeout(800);hotkey()
                wait_until(lambda:worker.evaluate('chrome.storage.local.get("outbox").then(s => Object.keys(s.outbox||{}).length)')>0)
                page.wait_for_timeout(1200)
                queued=worker.evaluate('chrome.storage.local.get("outbox")')['outbox']
                assert any(v.get('preview_data_url') for v in queued.values())
                passed('Local service unavailable','URL and preview remain in the extension retry queue without requiring another upload.')
                service=CaptureServer(('127.0.0.1',8765),store,token,sources)
                thread=threading.Thread(target=service.serve_forever,daemon=True);thread.start()
                worker.evaluate('flushQueue()');wait_until(lambda:len(store.all())==3)
                assert worker.evaluate('chrome.storage.local.get("outbox").then(s=>Object.keys(s.outbox||{}).length)')==0
                passed('Queued capture retry','Existing queue delivered to local storage; retry handler tested directly, context-menu UI not clicked.')
                lab.bring_to_front();lab.reload();lab.wait_for_selector('.card');lab.wait_for_timeout(400)
                with lab.expect_download() as download:
                    lab.get_by_role('button',name='Export test results').click()
                path=download.value.path();export=json.loads(Path(path).read_text())
                assert len(export['sources'])==8 and len(export['captures'])==3 and token not in json.dumps(export)
                passed('Private result export','Export has original eight inputs and explicit fixture records, without the local pairing token or image blobs.')
                context.close()
        finally:
            config.write_text(original)
            service.shutdown();service.server_close();fixture.shutdown();fixture.server_close();store.db.close()
            report={'scope':'Controlled, offline fixtures only. Not the eight live user references.','real_source_captures':0,'paid_api_calls':0,'real_embed_playback_verified':False,'tests':records}
            (evidence/'browser-smoke.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    if '--allow-extension-test' not in sys.argv:
        raise SystemExit('Optional integration test, NOT executed in this environment. Requires an unmanaged Linux test browser and Xvfb. Run with --allow-extension-test only where extension installation is permitted.')
    main()
