// Phase24C: local Firebase AUTH + RTDB Emulator ONLY.
// Verify a merging preview preserves both existing games, while Yokai is
// controlled by its independently validated anonymous UID/seat Rules.
// There are NO calls to actual mygame-df915 Firebase services.
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {initializeTestEnvironment,assertSucceeds,assertFails}=
 require('@firebase/rules-unit-testing');
(async()=>{
 const endpoint=process.env.FIREBASE_DATABASE_EMULATOR_HOST||'';
 if(!/^(localhost|127\.0\.0\.1):9000$/.test(endpoint))
  throw Error('Refuse any non-local Firebase rules test');
 const {previewSharedRules}=await import('../tools/preview-shared-rtdb-rules.mjs');
 const old={rules:{
  '.read':false,'.write':false,
  brawlExistingRooms:{'.read':true,'.write':true},
  shokokuRooms1v1:{'$code':{'.read':true,'.write':true}}
 }};
 const addon=JSON.parse(fs.readFileSync('network/emulator/database.rules.json','utf8'));
 const merged=previewSharedRules(old,addon);
 const [host,port]=endpoint.split(':');
 const env=await initializeTestEnvironment({projectId:'demo-yokai-lab',
  database:{host,port:Number(port),rules:JSON.stringify(merged)}});
 let passed=0;
 const allow=async(label,p)=>{await assertSucceeds(p);passed++;console.log('MERGE ALLOW',label);};
 const deny=async(label,p)=>{await assertFails(p);passed++;console.log('MERGE DENY',label);};
 const a=env.authenticatedContext('host').database();
 const b=env.authenticatedContext('guest').database();
 const c=env.authenticatedContext('intruder').database();
 const anon=env.unauthenticatedContext().database();
 const base='yokaiRoomsV1/654321',session='a'.repeat(32);
 const room={version:13,phase:'lobby',hostUid:'host',session,createdAt:Date.now()};
 try{
  await allow('BRAWL legacy read/write unaffected',
   anon.ref('brawlExistingRooms/phase24-fixture').set({playing:true}));
  await allow('BRAWL legacy read unaffected',
   c.ref('brawlExistingRooms/phase24-fixture').once('value'));
  await allow('Shokoku legacy read/write unaffected',
   anon.ref('shokokuRooms1v1/98765').set({playing:true}));
  await allow('Shokoku legacy read unaffected',
   c.ref('shokokuRooms1v1/98765').once('value'));
  await deny('no unauthenticated room creation',anon.ref(base).set(room));
  await allow('anonymous Firebase Auth host creates Yokai room',a.ref(base).set(room));
  await deny('signed-out client cannot read Yokai room',anon.ref(base).once('value'));
  await allow('signed-in guest joins correct room',b.ref(base+'/guestUid').set('guest'));
  await deny('intruder cannot claim occupied seat',c.ref(base+'/guestUid').set('intruder'));
  await deny('guest cannot overwrite room host',b.ref(base+'/hostUid').set('guest'));
  await deny('guest cannot forge authoritative battle state',
   b.ref(base+'/state').set({session,revision:0,stateJson:'{}'}));
  await allow('authorized host can start battle',a.ref(base+'/phase').set('playing'));
  await allow('authorized host can publish first state',
   a.ref(base+'/state').set({session,revision:0,stateJson:'{}'}));
  await deny('intruder cannot publish host state',
   c.ref(base+'/state').set({session,revision:1,stateJson:'{}'}));
  await allow('guest writes own sequential rotate intent',
   b.ref(base+'/inputs/guest').set({session,clientSeq:1,intent:{type:'rotate',direction:1}}));
  await deny('host cannot impersonate guest input',
   a.ref(base+'/inputs/guest').set({session,clientSeq:2,intent:{type:'rotate',direction:1}}));
  console.log('SHARED-FIREBASE-EMULATOR-PASS',passed,
   'synthetic preserved legacy branches and isolated anonymous Yokai host/guest');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
