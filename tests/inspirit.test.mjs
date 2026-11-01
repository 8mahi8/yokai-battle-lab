import test from 'node:test';
import assert from 'node:assert/strict';
import {createInspiritLedger} from '../engine/inspirit.mjs';
const ids=['A1','A2','B1'];
test('negative Inspirit does not expire merely by global battle actions',()=>{
 const ledger=createInspiritLedger(ids);
 ledger.apply({id:'A1',sign:'negative',effect:'sleep',source:'B1'});
 for(let i=0;i<200;i++)ledger.tick({actorId:'B1'});
 assert.ok(ledger.has('A1','sleep'));
});
test('positive non-turn Inspirit expires after exactly 30 global actions',()=>{
 const ledger=createInspiritLedger(ids);
 ledger.apply({id:'A1',sign:'positive',effect:'strength-up'});
 for(let i=0;i<29;i++)ledger.tick({actorId:'B1'});
 assert.equal(ledger.list('A1')[0].remaining,1);
 assert.equal(ledger.tick({actorId:'B1'}).length,1);
 assert.equal(ledger.list('A1').length,0);
});
test('explicit owner-turn expiry ticks only on owner action',()=>{
 const ledger=createInspiritLedger(ids);
 ledger.apply({id:'A2',sign:'negative',effect:'weaken',duration:2});
 for(let i=0;i<50;i++)ledger.tick({actorId:'B1'});
 assert.equal(ledger.list('A2')[0].remaining,2);
 ledger.tick({actorId:'A2'});assert.equal(ledger.list('A2')[0].remaining,1);
 ledger.tick({actorId:'A2'});assert.equal(ledger.list('A2').length,0);
});
test('rear-only purification checks owner and removes only negative',()=>{
 const ledger=createInspiritLedger(ids);
 ledger.apply({id:'A1',sign:'positive',effect:'strength-up'});
 ledger.apply({id:'A1',sign:'negative',effect:'sleep'});
 assert.equal(ledger.purify({id:'A1',side:0,benchIds:['A2']}).reason,'must_be_on_bench');
 assert.throws(()=>ledger.purify({id:'A1',side:1,benchIds:['A1']}));
 assert.equal(ledger.purify({id:'A1',side:0,benchIds:['A1']}).removed.length,1);
 assert.equal(ledger.list('A1')[0].sign,'positive');
});
test('ledger snapshots are defensive and input data is checked',()=>{
 const ledger=createInspiritLedger(ids);
 ledger.apply({id:'A1',sign:'negative',effect:'sleep'});
 const outside=ledger.list('A1');outside[0].effect='tampered';
 assert.equal(ledger.list('A1')[0].effect,'sleep');
 assert.throws(()=>ledger.apply({id:'A0',sign:'negative',effect:'sleep'}));
 assert.throws(()=>ledger.apply({id:'A1',sign:'bad',effect:'sleep'}));
 assert.throws(()=>ledger.tick({actorId:'nonexistent'}));
});
