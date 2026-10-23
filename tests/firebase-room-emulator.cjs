// Only the demo-yokai-lab Firebase RTDB emulator. Never deploy these Rules.
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
async function main(){
 const remote=process.env.FIREBASE_DATABASE_EMULATOR_HOST;
 if(!remote||!(/^(127\.0\.0\.1|localhost):9000$/).test(remote))
  throw Error('Refusing to run without local Firebase emulator');
 const [host,port]=remote.split(':');
 const env=await initializeTestEnvironment({projectId:'demo-yokai-lab',
  database:{host,port:Number(port),rules:fs.readFileSync('network/emulator/database.rules.json','utf8')}});
 let tests=0;
 const pass=async(label,p)=>{await assertSucceeds(p);tests++;console.log('ALLOW',label);};
 const deny=async(label,p)=>{await assertFails(p);tests++;console.log('DENY',label);};
 const user=uid=>env.authenticatedContext(uid).database();
 const a=user('alpha'),b=user('bravo'),c=user('charlie'),anon=env.unauthenticatedContext().database();
 const path='yokaiRoomsV1/012345',session='0123456789abcdef0123456789abcdef';
 const room={version:13,phase:'lobby',hostUid:'alpha',session,createdAt:Date.now()};
 try{
  await deny('anonymous cannot create room',anon.ref(path).set(room));
  await pass('authenticated host creates room',a.ref(path).set(room));
  await deny('cannot replace whole room',a.ref(path).set({...room,hostUid:'charlie'}));
  await deny('anonymous cannot read',anon.ref(path).once('value'));
  await pass('authenticated guest can look up room code',b.ref(path).once('value'));
  await pass('anonymous-auth guest claims open seat',b.ref(path+'/guestUid').set('bravo'));
  await deny('third player cannot steal guest seat',c.ref(path+'/guestUid').set('charlie'));
  await deny('guest cannot change host UID',b.ref(path+'/hostUid').set('bravo'));
  await deny('guest cannot start match',b.ref(path+'/phase').set('playing'));
  await pass('host starts after guest joins',a.ref(path+'/phase').set('playing'));
  await deny('host cannot revert phase',a.ref(path+'/phase').set('lobby'));
  await deny('extra unknown room field',a.ref(path+'/secret').set('oops'));
  await pass('host presence update',a.ref(path+'/presence/host').set(true));
  await pass('guest presence update',b.ref(path+'/presence/guest').set(true));
  await pass('disconnection clears own presence',b.ref(path+'/presence/guest').set(false));
  await deny('guest cannot forge host presence',b.ref(path+'/presence/host').set(false));
  const input={session,clientSeq:1,intent:{type:'rotate',direction:1}};
  await pass('guest own command',b.ref(path+'/inputs/guest').set(input));
  await deny('third-party input cannot impersonate guest',c.ref(path+'/inputs/guest').set({...input,clientSeq:2}));
  await deny('guest cannot impersonate host',b.ref(path+'/inputs/host').set(input));
  await deny('stale sequence rejected',b.ref(path+'/inputs/guest').set({...input,clientSeq:0}));
  await deny('foreign session rejected',b.ref(path+'/inputs/guest').set({...input,clientSeq:2,session:'f'.repeat(32)}));
  await deny('unknown action rejected',b.ref(path+'/inputs/guest').set({...input,clientSeq:2,intent:{type:'setHP'}}));
  await pass('guest second command',b.ref(path+'/inputs/guest').set({...input,clientSeq:2,intent:{type:'watch',mode:'zero'}}));
  const state={session,revision:0,state:{version:1,revision:0,clientSequences:[0,0],hash:'abdc',game:{clock:1}}};
  await deny('guest cannot publish authoritative state',b.ref(path+'/state').set(state));
  await pass('host publishes initial state',a.ref(path+'/state').set(state));
  await deny('host cannot replay revision',a.ref(path+'/state').set(state));
  await deny('host cannot change room session',a.ref(path+'/session').set('f'.repeat(32)));
  await deny('host cannot mutate other-game namespace',a.ref('rooms/12345').set(true));
  console.log('EMULATOR RULES PASS '+tests+' permission checks');
 }finally{await env.cleanup();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
