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
