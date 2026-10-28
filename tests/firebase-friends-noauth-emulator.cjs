/**
 * Phase37: real Firebase RTDB emulator + unauthenticated test clients.
 * NEVER points at mygame-df915; tests real Rules but NOT cloud deployment.
 */
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {initializeTestEnvironment,assertSucceeds,assertFails}=
 require('@firebase/rules-unit-testing');
async function main(){
 const endpoint=process.env.FIREBASE_DATABASE_EMULATOR_HOST||'';
 if(!/^(127\.0\.0\.1|localhost):9000$/.test(endpoint))
  throw Error('Refuse any database other than localhost:9000');
 const [host,port]=endpoint.split(':');
 const env=await initializeTestEnvironment({
  projectId:'demo-yokai-lab',
  database:{host,port:+port,
   rules:fs.readFileSync('network/emulator/database.friends-noauth.rules.json','utf8')}
 });
 const hostDb=env.unauthenticatedContext().database();
 const guestDb=env.unauthenticatedContext().database();
 const deny=(name,p)=>assertFails(p).then(()=>console.log('DENY '+name));
 const allow=(name,p)=>assertSucceeds(p).then(()=>console.log('ALLOW '+name));
 const h='a'.repeat(32),g='b'.repeat(32),session='1234567890abcdef1234567890abcdef';
 const id='827391',path='yokaiRoomsV1/'+id;
 const first={version:13,hostUid:h,session,phase:'lobby',createdAt:Date.now()};
 try {
  await deny('other shared games namespace untouched',hostDb.ref('shokokuRooms1v1/22222').set({x:1}));
  await deny('room list cannot be enumerated',hostDb.ref('yokaiRoomsV1').once('value'));
  await deny('invalid code prevented',hostDb.ref('yokaiRoomsV1/unsafe-room').set(first));
  await deny('invalid room seed prevented',hostDb.ref('yokaiRoomsV1/827392').set({...first,hostUid:'x'}));
  await allow('host creates room without Auth',hostDb.ref(path).set(first));
  await allow('guest reads six-digit room without Auth',guestDb.ref(path).once('value'));
  await deny('no wholesale overwrite after create',hostDb.ref(path).set({...first,guestUid:g}));
  await deny('wrong guest ID prevented',guestDb.ref(path+'/guestUid').set('short'));
  await allow('guest claims open seat',guestDb.ref(path+'/guestUid').set(g));
  await deny('third seat cannot replace guest',hostDb.ref(path+'/guestUid').set('c'.repeat(32)));
  await allow('begin play with both seats',hostDb.ref(path+'/phase').set('playing'));
  await deny('cannot revert finished state',guestDb.ref(path+'/phase').set('lobby'));
  await deny('cannot rewrite host UID',guestDb.ref(path+'/hostUid').set('c'.repeat(32)));
  await allow('guest input',guestDb.ref(path+'/inputs/guest').set({
   session,clientSeq:1,intent:{type:'rotate',direction:1}
  }));
  await deny('invalid move type',guestDb.ref(path+'/inputs/guest').set({
   session,clientSeq:2,intent:{type:'setHP'}
  }));
  await deny('same sequence cannot overwrite earlier input',guestDb.ref(path+'/inputs/guest').set({
   session,clientSeq:1,intent:{type:'rotate',direction:-1}
  }));
  await deny('host input path not used',hostDb.ref(path+'/inputs/host').set({
   session,clientSeq:1,intent:{type:'rotate',direction:1}
  }));
  const original={session,revision:0,stateJson:JSON.stringify({
   revision:0,clientSequences:[0,0],game:{winner:null,turn:0}
  })};
  await allow('snapshot preserved',hostDb.ref(path+'/state').set(original));
  await deny('no stale snapshot revision',hostDb.ref(path+'/state').set(original));
  await allow('revision advances',hostDb.ref(path+'/state').set({...original,revision:1}));
  await allow('host presence',hostDb.ref(path+'/presence/host').set(true));
  await allow('guest presence',guestDb.ref(path+'/presence/guest').set(true));

  // Reuse actual existing Firebase room adapter WITHOUT Auth SDK or user sign-in.
  const {createFirebaseRoomClient}=await import('../network/firebase-room.mjs');
  const {createMatchProtocol}=await import('../engine/match-protocol.mjs');
  const hClient=createFirebaseRoomClient({database:hostDb,uid:h});
  const gClient=createFirebaseRoomClient({database:guestDb,uid:g});
  const room='827395';
  assert.equal((await hClient.createRoom({code:room})).ok,true);
  assert.equal((await gClient.joinRoom(room)).ok,true);
  assert.equal((await hClient.startRoom()).ok,true);
  const received=[];
  const stop=hClient.subscribeInputs(p=>received.push(p));
  assert.equal((await gClient.sendIntent(1,{type:'rotate',direction:1})).ok,true);
  for(let i=0;i<75&&!received.length;i++)await new Promise(resolve=>setTimeout(resolve,40));
  assert.equal(received.length,1,'real guest intent reaches host');
  const match=createMatchProtocol({battleOptions:{seed:212,playtestSoulTuning:true}});
  const ack=match.dispatch(1,received[0].clientSeq,received[0].intent);
  assert.equal(ack.accepted,true);
  assert.equal((await hClient.publishSnapshot(match.snapshot())).ok,true);
  const packet=await gClient.readPublishedSnapshot();
  assert.equal(packet.revision,1);
  assert.equal(packet.game.winner,null);

  // Phase2.1C-2: prove the actual no-Auth Friends RTDB snapshot can carry
  // several canonical combat results after a guest wheel command. This
  // exercises the existing school transport, not a mock Cloud/Auth path.
  for(let turn=0;turn<24;turn++){
   const step=match.advanceAuto();
   assert.equal(step.ok,true,'canonical school combat must keep stepping');
  }
  const advanced=match.snapshot();
  assert.equal(advanced.revision,25);
  assert.equal(advanced.clientSequences[1],1,'guest wheel ACK survives auto battle');
  assert.ok(advanced.game.turn>=20,'real combat advanced by repeated host actions');
  assert.ok(advanced.game.squads.flat().every(unit=>
   !Object.hasOwn(unit,'techniquePlaySources')&&
   !Object.hasOwn(unit,'techniquePenetrate')),
   'original six keep unknown Play/Penetrate research-only');
  assert.equal((await hClient.publishSnapshot(advanced)).ok,true,
   'host can publish accumulated canonical actions on actual Friends RTDB');
  const guestAdvanced=await gClient.readPublishedSnapshot();
  assert.deepEqual(guestAdvanced,advanced,
   'guest must read the same canonical multi-action state, not a separate damage simulation');
  console.log('FIREBASE-FRIENDS-COMBAT-REGRESSION-PASS 24 host actions, ACK, canonical snapshot parity');
  stop();hClient.leaveLocal();gClient.leaveLocal();
  console.log('FIREBASE-FRIENDS-NOAUTH-PASS room, seat, command, snapshot, rules');
 } finally {await env.cleanup();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
