import test from 'node:test';
import assert from 'node:assert/strict';
import {createYw2SourceIndex,YW2_SOURCE_INTAKE_SCHEMA}
 from '../content/yw2-source-intake.mjs';
import {YW2_REFERENCE_SOURCES,YW2_ORIGINAL_REFERENCE_INDEX,
 YW2_ORIGINAL_REFERENCE_IDS}
 from '../content/yw2-original-reference-pack.mjs';
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {createMatchProtocol,replayMatchJournal}
 from '../engine/match-protocol.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const index=YW2_ORIGINAL_REFERENCE_INDEX;
const source=clone(index.sources);
const characters=()=>clone(index.characters);
const pack=x=>createYw2SourceIndex({sources:source,characters:x});

test('V3-4-5: sourced first original Yo-kai Watch 2 names, labels and ranks are not rental fixtures',()=>{
 assert.equal(index.schema,YW2_SOURCE_INTAKE_SCHEMA);
 assert.deepEqual(YW2_ORIGINAL_REFERENCE_IDS,['yw2:jibanyan','yw2:komasan']);
 assert.deepEqual(index.characters.map(x=>x.name),['ジバニャン','コマさん']);
 assert.deepEqual(index.characters.map(x=>x.rank),['D','D']);
 assert.deepEqual(index.characters.map(x=>x.tribe),['プリチー','プリチー']);
 assert.deepEqual(index.getPreview('yw2:jibanyan').moveLabels,{
  attack:'するどいつめ',technique:'火花の術',
  inspirit:'しびれるお札',soultimate:'ひゃくれつ肉球'
 });
 assert.deepEqual(index.getPreview('yw2:komasan').moveLabels,{
  attack:'パンチ',technique:'火炎の術',
  inspirit:'やけどさせる',soultimate:'ひとだま乱舞'
 });
 assert.equal(index.getPreview('yw2:jibanyan').skillLabel,'まえのめり');
 assert.equal(index.getPreview('yw2:komasan').skillLabel,'「あ」');
 assert.equal(index.getPreview('yw2:jibanyan').battleReady,false);
 assert.equal(index.getPreview('yw2:komasan').battleReady,false);
 assert.equal(index.getPreview('nonexistent'),null);
 assert.equal(RENTAL_LAB_CATALOG.characters.length,6);
 assert.equal(RENTAL_SCHOOL_CATALOG.characters.length,6);
 assert.equal(RENTAL_LAB_CATALOG.getCharacter('yw2:jibanyan'),null);
});

test('V3-4-5 Jibanyan unresolved 5-vs-7 hit discrepancy and skill detail conflict stay visible',()=>{
 const j=index.getCharacter('yw2:jibanyan'),v=index.getPreview(j.id);
 const hit=j.moves.soultimate.hits;
 assert.equal(hit.status,'disputed');
 assert.deepEqual(hit.claims.map(c=>c.value),[5,7]);
 assert.equal(j.moves.soultimate.power.claims[0].value,20);
 assert.ok(hit.sourceIds.includes('jibanyan_guide'));
 assert.ok(hit.sourceIds.includes('jibanyan_mtw'));
 assert.equal(j.skill.effect.status,'disputed');
 assert.deepEqual(v.conflicts,['soultimate.hits']);
 assert.equal(j.moves.attack.hits.claims[0].value,2);
 assert.equal(j.moves.technique.power.claims[0].value,20);
 assert.deepEqual(v.level99Stats,{
  hp:322,strength:153,spirit:90,defense:108,speed:165
 });
 assert.equal(v.battleReady,false);
});

test('V3-4-5 Komasan source disagreement on level 99 stats is not silently resolved',()=>{
 const k=index.getCharacter('yw2:komasan'),preview=index.getPreview(k.id);
 for(const stat of ['hp','strength','spirit','defense','speed']){
  assert.equal(k.stats[stat].status,'disputed');
  assert.ok(k.stats[stat].claims.length>=2);
  assert.equal(preview.level99Stats[stat],null);
 }
 assert.equal(k.moves.attack.power.claims[0].value,15);
 assert.equal(k.moves.technique.power.claims[0].value,50);
 assert.equal(k.moves.soultimate.power.claims[0].value,100);
 assert.equal(k.moves.soultimate.hits.claims[0].value,1);
 assert.equal(k.moves.inspirit.effect.claims[0].value,'hp-over-time');
 assert.equal(k.skill.effect.claims[0].value,
  'となりにスキル「うん」がいるとようりょく上昇');
 assert.equal(preview.battleReady,false);
});

test('V3-4-5 every authored identity, move label and claim has explicit supported HTTPS citations',()=>{
 assert.ok(Object.values(index.sources).every(
  url=>url.startsWith('https://')&&!url.includes(' ')));
 const checkRefs=refs=>{
  assert.ok(refs.length>0);
  for(const id of refs){
   assert.ok(Object.hasOwn(index.sources,id),'missing source: '+id);
   assert.ok(index.sources[id].startsWith('https://'));
  }
 };
 for(const c of index.characters){
  checkRefs(c.identitySourceIds);
  for(const slot of ['attack','technique','inspirit','soultimate']){
   const m=c.moves[slot];
   checkRefs(m.labelSourceIds);
   for(const key of ['power','hits','element','effect']){
    const fact=m[key];
    checkRefs(fact.sourceIds);
    assert.ok(['documented','disputed','unknown'].includes(fact.status));
    for(const claim of fact.claims)checkRefs(claim.sourceIds);
   }
  }
  for(const key of ['label','effect'])checkRefs(c.skill[key].sourceIds);
  for(const fact of Object.values(c.stats))checkRefs(fact.sourceIds);
 }
});

test('V3-4-5 reject invented documented facts, fabricated consensus and source-less labels',()=>{
 const good=characters();
 const missing=clone(good);
 missing[0].moves.attack.power.sourceIds=['invented_guide'];
 assert.throws(()=>pack(missing),/provenance/);
 const noLabel=clone(good);
 noLabel[0].moves.technique.labelSourceIds=[];
 assert.throws(()=>pack(noLabel),/move slot fact/);
 const falseConsensus=clone(good);
 const disputed=falseConsensus[0].moves.soultimate.hits;
 disputed.claims[1].value=5;
 assert.throws(()=>pack(falseConsensus),/conflicting claims/);
 const fabricated=clone(good);
 fabricated[0].moves.soultimate.hits={
  status:'documented',sourceIds:['jibanyan_guide','jibanyan_mtw'],
  claims:[{value:5,sourceIds:['jibanyan_guide']},
   {value:7,sourceIds:['jibanyan_mtw']}]
 };
 assert.throws(()=>pack(fabricated),/documented fact/);
 const unsupported=clone(good);
 unsupported[0].stats.hp={status:'unknown',sourceIds:['jibanyan_game8'],
  claims:[{value:999,sourceIds:['jibanyan_game8']}]};
 assert.throws(()=>pack(unsupported),/unknown fact/);
 const dup=clone(good);dup.push(clone(good[0]));
 assert.throws(()=>pack(dup),/repeated/);
 const fakeGame=clone(good);fakeGame[0].game='yw1';
 assert.throws(()=>pack(fakeGame),/invalid/);
 assert.equal(index.getCharacter('yw2:jibanyan').stats.hp.claims[0].value,322);
});

test('V3-4-5 index, previews and source values are immutable and independent of caller data',()=>{
 const entries=characters(),urls=clone(YW2_REFERENCE_SOURCES);
 const isolated=createYw2SourceIndex({sources:urls,characters:entries});
 const first=isolated.getCharacter('yw2:jibanyan');
 assert.ok(Object.isFrozen(first));
 assert.ok(Object.isFrozen(first.moves.attack));
 assert.ok(Object.isFrozen(first.moves.soultimate.hits.claims));
 assert.ok(Object.isFrozen(isolated.sources));
 assert.ok(Object.isFrozen(isolated.getPreview('yw2:jibanyan')));
 entries[0].name='fake';
 entries[0].moves.attack.power.claims[0].value=9999;
 urls.jibanyan_guide='https://wrong.example/x';
 assert.equal(isolated.getCharacter('yw2:jibanyan').name,'ジバニャン');
 assert.equal(first.moves.attack.power.claims[0].value,10);
 assert.equal(isolated.sources.jibanyan_guide,
  YW2_REFERENCE_SOURCES.jibanyan_guide);
 assert.throws(()=>{first.name='forged'},TypeError);
 assert.throws(()=>{isolated.getPreview(first.id).moveLabels.attack='x'},TypeError);
});

test('V3-4-5 importing original source pack does not alter current PvP schema, hashes or RNG',()=>{
 for(const seed of [3,42,212])for(const school of [false,true]){
  const before=createMatchProtocol({
   battleOptions:{seed,playtestSoulTuning:school}});
  const initial=before.snapshot();
  // Source label lookup must not affect the seed, simulation, or player turn.
  const preview=index.getPreview('yw2:jibanyan');
  assert.equal(preview.battleReady,false);
  assert.deepEqual(before.snapshot(),initial);
  const after=createMatchProtocol({
   battleOptions:{seed,playtestSoulTuning:school}});
  for(let i=0;i<85;i++){
   assert.deepEqual(before.advanceAuto(),after.advanceAuto());
   assert.deepEqual(before.snapshot(),after.snapshot());
   if(before.snapshot().game.winner!==null)break;
  }
  assert.equal(replayMatchJournal(before.exportJournal()).ok,true);
  assert.equal(replayMatchJournal(after.exportJournal()).ok,true);
 }
});
