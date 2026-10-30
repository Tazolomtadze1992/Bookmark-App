import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesReference,searchShortcut} from '../web/search.js';

const item={title:'Security page',description:'A shield with layered text',url:'https://x.com/i/status/123'};
const metadata={author_name:'Jakub Krehel',author_handle:'jakubkrehel',text:'Two opposite masks and blurred headings'};
test('finds a saved author without requiring their name in the visible card',()=>{
 for(const query of ['Jakub Krehel','JAKUB','krehel','jakubkrehel','@jakubkrehel','jakub shield','  jakub   masks  '])assert.equal(matchesReference(item,metadata,query),true,query);
 assert.equal(matchesReference(item,metadata,'jakub sidebar'),false);
 assert.equal(matchesReference(item,{author_name:'Someone Else'},'jakub'),false);
});
test('matches full saved text, links and observed authors; handles missing metadata and accents',()=>{
 assert.equal(matchesReference(item,metadata,'opposite headings'),true);
 assert.equal(matchesReference(item,metadata,'x.com/i/status/123'),true);
 assert.equal(matchesReference({...item,author_observed:'Jakub Krehél @jakubkrehel'},null,'jakub krehel'),true);
 assert.equal(matchesReference({title:'Café animation',url:'https://example.com'},{},'cafe'),true);
 assert.equal(matchesReference({title:'Website',url:'https://example.com'},null,'example.com'),true);
 assert.equal(matchesReference({},undefined,'  '),true);
 assert.equal(matchesReference({},undefined,'jakub'),false);
});
test('search shortcuts respect typing, composition, browser modifiers and the open viewer',()=>{
 assert.equal(searchShortcut({key:'/'}),true);
 assert.equal(searchShortcut({key:'k',metaKey:true}),true);
 assert.equal(searchShortcut({key:'k',ctrlKey:true}),true);
 assert.equal(searchShortcut({key:'k'}),false);
 assert.equal(searchShortcut({key:'/',target:{closest:()=>({})}}),false);
 assert.equal(searchShortcut({key:'/',target:{isContentEditable:true}}),false);
 for(const flag of ['defaultPrevented','repeat','isComposing','altKey','shiftKey'])assert.equal(searchShortcut({key:'k',metaKey:true,[flag]:true}),false);
 assert.equal(searchShortcut({key:'k',metaKey:true},{modalOpen:true}),false);
 assert.equal(searchShortcut({key:'/',ctrlKey:true}),false);
});
