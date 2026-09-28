"""Controlled DOM-rendering test with mocked fetch. No browser network or extension.

This tests HTML, extraction functions, and UI behavior only. The actual local
HTTP service is tested separately by test_lab.py. It does not prove integration.
"""
import base64,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import ROOT,Store
from browser_smoke import FIXTURE,X_FIXTURE
from playwright.sync_api import sync_playwright

def main():
    evidence=ROOT/'evidence';results=[]
    def passed(name,detail):results.append({'test':name,'status':'passed','detail':detail});print('PASS:',name,flush=True)
    js=(ROOT/'extension/background.js').read_text();extract=js[js.index('function readVisiblePage()'):js.index('async function preparePreview')]
    with tempfile.TemporaryDirectory() as d,sync_playwright() as p:
        store=Store(Path(d))
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=10000,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
        try:
            context=browser.new_context(viewport={'width':1360,'height':900},accept_downloads=True)
            page=context.new_page();page.set_content(FIXTURE)
            meta=page.evaluate('(url)=>{const location={href:url};'+extract+';return readVisiblePage();}','https://controlled-fixture.example/')
            assert meta['title']=='Controlled capture fixture';assert meta['fixture']
            passed('Website extraction function','Title and description read from a controlled document; simulated location, no live navigation or extension permissions.')
            image=page.screenshot(type='jpeg',quality=78)
            meta.update({'preview_data_url':'data:image/jpeg;base64,'+base64.b64encode(image).decode(),'preview_method':'playwright_controlled_fixture'})
            item=store.save(meta)['item'];(evidence/'controlled-captured-preview.jpg').write_bytes(image)
            passed('Image storage','Renderer-created JPEG stored successfully; chrome.tabs.captureVisibleTab is not tested.')
            page.set_content(X_FIXTURE.replace('href="/capture_fixture','href="https://x.com/capture_fixture'))
            xm=page.evaluate('(url)=>{const location={href:url};'+extract+';return readVisiblePage();}','https://x.com/capture_fixture/status/1234567890123456789')
            assert xm['author']=='Fixture Author @capture_fixture';assert xm['media_observed']['video_element_seen'];assert xm['crop']
            shot=page.screenshot(type='jpeg',quality=78,clip=xm['crop'])
            xm.update({'preview_data_url':'data:image/jpeg;base64,'+base64.b64encode(shot).decode(),'preview_method':'controlled_dom_crop','fixture':True})
            xi=store.save(xm)['item'];assert xi['playback']=='not_tested'
            passed('Exact-post extraction function','Controlled X-shaped DOM yields an author and media crop. No real X content or video playback was inspected.')
            (evidence/'controlled-x-crop.jpg').write_bytes(shot)
            data={'sources':json.loads((ROOT/'sources.json').read_text())['sources'],'captures':store.all(),'x_probe':None}
            pictures={i['id']:base64.b64encode(store.image(i['id'])).decode() for i in store.all()}
            html=(ROOT/'web/index.html').read_text().replace('__LOCAL_TOKEN__','fake-render-test-token').replace('<link rel="stylesheet" href="/style.css">','').replace('<script type="module" src="/app.js"></script>','')
            page.set_content(html);page.add_style_tag(content=(ROOT/'web/style.css').read_text())
            page.evaluate('''({state,images})=>{
              window.mockState=state;
              window.fetch=async(path,options={})=>{
                if(path.startsWith('/api/image/')){const b=atob(images[path.split('/').pop()]);return new Response(Uint8Array.from(b,c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/jpeg'}});}
                if(path==='/api/evaluation'){const update=JSON.parse(options.body);Object.assign(state.captures.find(c=>c.id===update.id),update);return Response.json({ok:true});}
                if(path.startsWith('/api/captures/')&&options.method==='DELETE'){state.captures=state.captures.filter(c=>c.id!==path.split('/').pop());return Response.json({deleted:true});}
                if(path==='/api/state'||path==='/api/export')return Response.json(state);
                throw Error('Unexpected request in mock UI test');
              };
            }''',{'state':data,'images':pictures})
            page.add_script_tag(content=(ROOT/'web/app.js').read_text(),type='module')
            page.wait_for_selector('.card',timeout=5000);page.wait_for_timeout(500)
            assert page.locator('.card').count()==2
            assert page.locator('#progress').inner_text()=='0 / 8 sources saved'
            assert page.locator('.card img').first.evaluate('(i)=>i.complete && i.naturalWidth>0')
            passed('Viewer renders controlled previews','Mock API returns actual fixture JPEGs. All eight user-supplied sources remain not captured.')
            page.locator('.card select').first.select_option('yes');page.wait_for_timeout(100)
            assert page.evaluate('mockState.captures.some(c=>c.recognisable===true)')
            passed('Assessment UI','Selection updates mocked data; server persistence covered by the separate Python tests.')
            page.screenshot(path=str(evidence/'controlled-lab.png'),full_page=True)
            with page.expect_download() as pending:page.get_by_role('button',name='Export test results').click()
            export=json.loads(Path(pending.value.path()).read_text());assert len(export['sources'])==8 and 'fake-render-test-token' not in json.dumps(export)
            passed('Export UI','Export contains mock fixture records and actual source IDs without the local token.')
            page.evaluate('mockState.captures[0].title="<img src=x onerror=alert(1)>"');page.get_by_role('button',name='Refresh',exact=True).click();page.wait_for_timeout(100)
            assert page.locator('.card h3').filter(has_text='<img').count()==1 and page.locator('.card h3 img').count()==0
            passed('Untrusted title rendering','Source markup is displayed as text, not executable HTML.')
            page.on('dialog',lambda dialog:dialog.accept());page.get_by_role('button',name='Delete local capture').first.click();page.wait_for_timeout(100)
            assert page.locator('.card').count()==1
            passed('Delete UI','Confirmed deletion updates the mocked capture list; real deletion covered separately.')
        finally:
            browser.close();store.db.close()
            (evidence/'viewer-smoke.json').write_text(json.dumps({'scope':'Controlled DOM rendering with MOCKED fetch, simulated location and generated fixtures. Not an integration test.','browser_restrictions':'Unpacked extensions and local URL navigation blocked by administrator policy; no bypass attempted.','real_source_captures':0,'extension_action_verified':False,'paid_api_calls':0,'live_x_playback_verified':False,'tests':results},indent=2))
    print('Controlled rendering checks passed:',len(results))
if __name__=='__main__':main()
