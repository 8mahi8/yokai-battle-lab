import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewSharedRules} from '../tools/preview-shared-rtdb-rules.mjs';

const friendRules=JSON.parse(readFileSync('network/emulator/database.friends-noauth.rules.json','utf8'));
function existing(){return {rules:{'.read':false,'.write':false,
 brawlRooms:{'.read':true,'.write':true},
 shokokuRooms1v1: {'$code':{'.read':true,'.write':true}}
}};}
test('no-Auth friend rules merge is preview only and leaves BRAWL/Shokoku rules untouched',()=>{
 const before=existing(),snapshot=JSON.stringify(before);
 const after=previewSharedRules(before,friendRules);
 assert.equal(JSON.stringify(before),snapshot,'caller data mutated');
 assert.deepEqual(after.rules.brawlRooms,before.rules.brawlRooms);
 assert.deepEqual(after.rules.shokokuRooms1v1,before.rules.shokokuRooms1v1);
 assert.equal(after.rules.yokaiRoomsV1['$code']['.read'],'$code.matches(/^[0-9]{6}$/)');
 assert.doesNotMatch(JSON.stringify(after.rules.yokaiRoomsV1),/auth\.uid|auth !== null/);
});
test('no-Auth friend rules preview refuses broader parent access, an occupied room root, and wildcard',()=>{
 const root=existing();root.rules['.write']=true;
 assert.throws(()=>previewSharedRules(root,friendRules),/unsafe_parent_write_grant/);
 const claimed=existing();claimed.rules.yokaiRoomsV1={'.read':true};
 assert.throws(()=>previewSharedRules(claimed,friendRules),/yokai_rules_already_present/);
 const wildcard=existing();wildcard.rules['$unknown']={'.write':true};
 assert.throws(()=>previewSharedRules(wildcard,friendRules),/unreviewed_root_wildcard/);
});
