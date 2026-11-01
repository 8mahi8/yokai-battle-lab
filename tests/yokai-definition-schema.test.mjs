import test from 'node:test';
import assert from 'node:assert/strict';
import {RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES}
 from '../content/rental-roster.mjs';
import {YOKAI_DEFINITION_SCHEMA,YOKAI_ACTION_SLOTS,
 validateYokaiDefinition,defineYokai} from '../content/yokai-definition.mjs';
import {RENTAL_YOKAI_LAB,RENTAL_YOKAI_SCHOOL}
 from '../content/rental-yokai-definitions.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
test('schema V1 covers all 6 original rentals with exactly 4 moves and an independent skill',()=>{
 for(const roster of [RENTAL_YOKAI_LAB,RENTAL_YOKAI_SCHOOL]){
  assert.equal(roster.length,6);
  assert.ok(Object.isFrozen(roster));
  assert.equal(new Set(roster.map(x=>x.id)).size,6);
  assert.equal(new Set(roster.flatMap(x=>YOKAI_ACTION_SLOTS.map(s=>x.moves[s].id))).size,24);
  for(let i=0;i<6;i++){
   const d=roster[i],legacy=RENTAL_SQUAD[i];
   assert.equal(validateYokaiDefinition(d),true);
   assert.equal(d.schema,YOKAI_DEFINITION_SCHEMA);
   assert.equal(d.name,legacy.name);
   assert.deepEqual([d.stats.hp,d.stats.strength,d.stats.spirit,d.stats.defense,
    d.stats.speed],[legacy.maxHp,legacy.strength,legacy.spirit,
    legacy.defense,legacy.speed]);
   assert.deepEqual(Object.keys(d.moves),YOKAI_ACTION_SLOTS);
   assert.equal(d.moves.attack.power,legacy.attackPower);
   assert.equal(d.moves.technique.power,legacy.techniquePower);
   assert.equal(d.skill.id,'skill:'+legacy.skill);
   assert.equal(d.moves.soultimate.hitPattern.type,
    ['buff','debuff','heal','revive','revive-heal'].includes(
      legacy.special?.kind??(legacy.technique==='heal'?'heal':'damage')
    )?'none':'unknown');
   assert.equal(d.moves.soultimate.hitPattern.count,
    d.moves.soultimate.hitPattern.type==='none'?0:null,
    'multiple targets must never be mistaken for repeated hits');
   for(const field of ['tribe','rank','faction','resistances','equipment'])
    assert.equal(d[field],null,'do not invent '+field);
   assert.equal(d.personality.seriousnessTier,null);
   assert.deepEqual(d.personality.actionWeights,
    roster===RENTAL_YOKAI_LAB?legacy.weights:SCHOOL_RENTAL_PERSONALITIES[i].weights);
   assert.ok(Object.isFrozen(d));
   assert.ok(Object.isFrozen(d.moves));
   assert.ok(Object.isFrozen(d.moves.attack.hitPattern));
  }
 }
});
test('character identity, move IDs and immutable attributes are unchanged in school mode',()=>{
 for(let i=0;i<6;i++){
  const a=RENTAL_YOKAI_LAB[i],b=RENTAL_YOKAI_SCHOOL[i];
  for(const field of ['id','name','stats','moves','skill','provenance'])
   assert.deepEqual(a[field],b[field]);
  assert.equal(b.personality.loafChancePercent,
   SCHOOL_RENTAL_PERSONALITIES[i].loafChance);
 }
});
test('authoring validation rejects missing move, fake hit count, fake evidence, invalid personality',()=>{
 const basic=RENTAL_YOKAI_LAB[0];
 const missing=copy(basic);
 delete missing.moves.inspirit;
 assert.throws(()=>validateYokaiDefinition(missing),/four move slots/);
 const multi=copy(basic);
 multi.moves.soultimate.hitPattern={type:'multi',count:1};
 assert.throws(()=>validateYokaiDefinition(multi),/multi count/);
 const unknown=copy(basic);
 unknown.moves.soultimate.hitPattern={type:'unknown',count:7};
 assert.throws(()=>validateYokaiDefinition(unknown),/unknown count/);
 const single=copy(basic);
 single.moves.attack.hitPattern={type:'single',count:3};
 assert.throws(()=>validateYokaiDefinition(single),/single hit/);
 const duplicated=copy(basic);
 duplicated.moves.technique.id=duplicated.moves.attack.id;
 assert.throws(()=>validateYokaiDefinition(duplicated),/unique/);
 const fake=copy(basic);
 fake.provenance.stats='original-exact';
 assert.throws(()=>validateYokaiDefinition(fake),/provenance/);
 const wrongProof=copy(basic);
 wrongProof.moves.attack.evidence='documented';
 assert.throws(()=>validateYokaiDefinition(wrongProof),/requires sourceRefs/);
 wrongProof.moves.attack.sourceRefs=['https://example.com/verified-record'];
 assert.equal(validateYokaiDefinition(wrongProof),true,
  'documented claims must carry an explicit reference');
 const falseSkillProof=copy(basic);
 falseSkillProof.skill.evidence='observed';
 assert.throws(()=>validateYokaiDefinition(falseSkillProof),/requires sourceRefs/);
 const falseStatProof=copy(basic);
 falseStatProof.provenance.stats='documented';
 assert.throws(()=>validateYokaiDefinition(falseStatProof),/requires sourceRefs/);
 const attitude=copy(basic);
 attitude.personality.seriousnessTier=8;
 assert.throws(()=>validateYokaiDefinition(attitude),/seriousness/);
 const weights=copy(basic);
 weights.personality.actionWeights=[1,2,3,4];
 assert.throws(()=>validateYokaiDefinition(weights),/actionWeights/);
});
test('defineYokai returns a deep-frozen copy, never mutates author-owned data',()=>{
 const source=copy(RENTAL_YOKAI_LAB[0]);
 const record=defineYokai(source);
 assert.notStrictEqual(source,record);
 assert.notStrictEqual(source.moves,record.moves);
 assert.ok(Object.isFrozen(record.moves.attack.hitPattern));
 source.stats.hp=999;
 assert.equal(record.stats.hp,RENTAL_SQUAD[0].maxHp);
 assert.throws(()=>{record.moves.attack.power=999},TypeError);
});
