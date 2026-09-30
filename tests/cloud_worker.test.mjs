import test from 'node:test';
import assert from 'node:assert/strict';
import {newPrefix,projectPost,normalise,digest} from '../supabase/functions/library-service/logic.js';
test('old bookmarks stay excluded even if rebookmarked above the anchor',()=>assert.deepEqual(newPrefix(['old','new','anchor'],['anchor'],['old'],[]),['new']));
test('older post ID can be a newly added bookmark',()=>assert.deepEqual(newPrefix(['1','900'],['900'],[],[]),['1']));
test('missing anchors, overlapping pages, and changed order fail closed',()=>{
 assert.throws(()=>newPrefix(['1'],['2'],[],[]),/Previous bookmarks/);
 assert.throws(()=>newPrefix(['2','2'],['2'],[],[]),/Overlapping/);
 assert.throws(()=>newPrefix(['3','2'],['2','3'],[],[]),/order/);
});
test('checkpoint retry does not reimport previously seen IDs',()=>assert.deepEqual(newPrefix(['new','anchor'],['anchor'],[],['new']),[]));
test('media quality chooses the best source under 12 Mbps and rejects foreign URLs',()=>{
 const post={id:'1',author_id:'u',attachments:{media_keys:['m']}};
 const includes={users:[{id:'u',name:'Author',profile_image_url:'https://evil.test/avatar'}],media:[{media_key:'m',width:2560,height:1440,type:'video',variants:[{content_type:'video/mp4',bit_rate:100000,url:'https://evil.test/low.mp4'},{content_type:'video/mp4',bit_rate:8000000,url:'https://video.twimg.com/good.mp4'},{content_type:'video/mp4',bit_rate:25000000,url:'https://video.twimg.com/4k.mp4'}]}]};
 const result=projectPost(post,includes);assert.equal(result.motion.url,'https://video.twimg.com/good.mp4');assert.equal(result.motion.width,2560);assert.equal(result.metadata.avatar,'');
});
test('X URL variants deduplicate using existing local identifiers',async()=>{
 assert.deepEqual(normalise('https://twitter.com/author/status/123?s=20'),{url:'https://x.com/i/status/123',post_id:'123'});
 assert.equal((await digest(normalise('https://x.com/author/status/123').url)).slice(0,32),(await digest('https://x.com/i/status/123')).slice(0,32));
 assert.throws(()=>normalise('https://x.com/home'));
 assert.throws(()=>normalise('https://user:password@example.com/'));
 assert.equal(normalise('https://example.com/?utm_source=x&project=hello#one').url,'https://example.com/?project=hello#one');
});
test('albums preserve all attachment keys in post order, not includes order',()=>{
 const keys=['a','b','c','d'];
 const media=keys.toReversed().map((media_key,i)=>({media_key,type:'photo',url:`https://pbs.twimg.com/media/${media_key}.jpg`,width:800,height:1200,alt_text:`Poster ${media_key}`}));
 const result=projectPost({attachments:{media_keys:keys}},{media});
 assert.deepEqual(result.metadata.media.map(m=>m.media_key),keys);
 assert.equal(result.metadata.media.length,4);assert.equal(result.poster,'https://pbs.twimg.com/media/a.jpg');assert.equal(result.motion,null);
 assert.equal(result.metadata.media[3].alt,'Poster d');
});
test('mixed albums keep independent videos and unavailable slots without unsafe URLs',()=>{
 const result=projectPost({attachments:{media_keys:['photo','video','missing','unsafe']}},{media:[
  {media_key:'photo',type:'photo',url:'https://pbs.twimg.com/photo.jpg'},
  {media_key:'video',type:'video',width:640,height:360,preview_image_url:'https://pbs.twimg.com/poster.jpg',variants:[{content_type:'video/mp4',bit_rate:1000,url:'https://video.twimg.com/clip.mp4'}]},
  {media_key:'unsafe',type:'photo',url:'https://evil.test/photo.jpg'}
 ]});
 assert.equal(result.motion,null);assert.equal(result.metadata.media[1].motion.url,'https://video.twimg.com/clip.mp4');
 assert.equal(result.metadata.media[2].type,'unavailable');assert.equal(result.metadata.media[3].poster,null);
 assert.deepEqual(projectPost({}).metadata.media,[]);
});

import {readBookmarkWindow, failurePatch, XRequestError, retryTime} from '../supabase/functions/library-service/sync-policy.js';
import {syncNotice} from '../web/sync-status.js';
const bookmarkPage=(ids,next)=>({data:ids.map(id=>({id})),meta:next?{next_token:next}:{}});
test('idle poll reads one bookmark, preserves full anchors, and reserves only five units',async()=>{
 const state={user_id:'99',anchors:['20','19','18']},calls=[];
 const result=await readBookmarkWindow({state,get:async(path,units)=>{calls.push({path,units});return bookmarkPage(['20']);}});
 assert.deepEqual(calls,[{path:'/2/users/99/bookmarks?max_results=1',units:5}]);assert.equal(result.unchanged,true);assert.deepEqual(state.anchors,['20','19','18']);
});
test('new head reads full window until old anchor without importing exclusions',async()=>{
 const state={user_id:'99',anchors:['20','19']};const replies=[bookmarkPage(['30']),bookmarkPage(['30','29'],'next'),bookmarkPage(['28','20'])];let calls=0;
 const result=await readBookmarkWindow({state,get:async()=>replies[calls++]});
 assert.equal(calls,3);assert.deepEqual(newPrefix(result.list,state.anchors,['29'],['28']),['30']);
});
test('changed head already known still scans; empty response preserves checkpoint',async()=>{
 const state={user_id:'99',anchors:['20','19']};let calls=0;
 const result=await readBookmarkWindow({state,get:async()=>++calls===1?bookmarkPage(['19']):bookmarkPage(['19'])});assert.equal(calls,2);assert.deepEqual(newPrefix(result.list,state.anchors,[],[]),[]);
 assert.equal((await readBookmarkWindow({state,get:async()=>({})})).unchanged,true);assert.deepEqual(state.anchors,['20','19']);
});
test('temporary failures schedule bounded retries without permanently disabling or enabling checks',()=>{
 for(const error of [new XRequestError(429),new XRequestError(503),new TypeError('fetch failed'),new DOMException('timeout','TimeoutError'),Error('Could not save the X reference.')]){
  const patch=failurePatch(error,{enabled:true},{now:1000});assert.equal(patch.enabled,undefined);assert.equal(patch.sync_issue,'retry');assert.equal(patch.retry_at,1900);
 }
 assert.equal(failurePatch(new XRequestError(429,9000),{consecutive_failures:10},{now:1000}).retry_at,9000);
 assert.equal(failurePatch(new XRequestError(503),{consecutive_failures:10},{now:1000}).retry_at,4600);
});
test('authorization, credits, uncertain rotation and invalid checkpoints require safe owner action',()=>{
 for(const e of [new XRequestError(401),new XRequestError(403),new XRequestError(402),Error('Bookmark order changed. Checkpoint preserved.')])assert.equal(failurePatch(e,{}).enabled,false);
 assert.equal(failurePatch(new TypeError('fetch'),{},{rotating:true}).sync_issue,'auth');
 assert.equal(failurePatch(Error('Spending allowance reached'),{budget_mode:'monthly',budget_reset_at:9000}).retry_at,9000);
 assert.equal(failurePatch(Error('Spending allowance reached'),{budget_mode:'monthly',budget_reset_at:9000}).enabled,undefined);
 assert.equal(failurePatch(Error('Spending allowance reached'),{}).enabled,false);
});
test('rate limit reset and Retry-After respected, with bounded malformed values',()=>{
 assert.equal(retryTime(new Headers({'retry-after':'120'}),1000),1120);
 assert.equal(retryTime(new Headers({'x-rate-limit-reset':'2000'}),1000),2000);
 assert.equal(retryTime(new Headers({'retry-after':'bad'}),1000),1000);
 assert.equal(retryTime(new Headers({'retry-after':'999999999'}),1000),87400);
});
test('paused, retrying, budget and overdue sync states stay visible even with successful old folders',()=>{
 assert.match(syncNotice({enabled:false,message:'Last check: 1 new bookmark(s).'}),/paused/);
 assert.match(syncNotice({enabled:true,sync_issue:'retry',retry_at:2000},null,1000),/Retrying/);
 assert.match(syncNotice({enabled:true,sync_issue:'budget',budget_reset_at:9000}),/monthly allowance/);
 assert.match(syncNotice({enabled:true,next_check:100},null,5000),/overdue/);
 assert.match(syncNotice({enabled:true,next_check:2000,last_check:900},null,1000),/Checked 1 min ago/);
});
