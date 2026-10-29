/**
 * V3-4-7: first ORIGINAL YW2 normal-attack/Technique data through the
 * existing CombatCatalog -> BattleProfile -> Combat engine path.
 *
 * This is explicitly a MIXED research actor: source-backed original two
 * normal moves and Lv99 reference stats, but trial AI/personality, passive
 * numbers, Inspirit/Soultimate mechanics. NOT a complete original Jibanyan.
 * No network, school roster or main UI imports this module.
 */
import {YW2_ORIGINAL_REFERENCE_INDEX}
 from './yw2-original-reference-pack.mjs';
import {RENTAL_YOKAI_REFERENCES_LAB}
 from './rental-yokai-definitions.mjs';
import {RENTAL_LAB_CATALOG,extendCombatCatalog}
 from './combat-catalog.mjs';
import {compileCatalogTeamsForCombat}
 from '../engine/catalog-battle-roster.mjs';
import {BATTLE_EXECUTION_PROFILE_SCHEMA_V2}
 from '../engine/catalog-battle-profile.mjs';
import {soulCapacityForRank} from '../engine/soul.mjs';

export const JIBANYAN_NORMAL_TRIAL_ID='yw2:jibanyan:normal-moves-lab';
const clone=x=>JSON.parse(JSON.stringify(x));
const slotId=slot=>JIBANYAN_NORMAL_TRIAL_ID+':'+slot;
const props=['hp','strength','spirit','defense','speed'];
function sourcedValue(fact,field,validate){
 if(!fact||fact.status!=='documented'||fact.claims?.length!==1)
  throw new TypeError('unresolved original fact: '+field);
 const claim=fact.claims[0];
 if(!validate(claim.value)||!Array.isArray(claim.sourceIds)||
    claim.sourceIds.length===0)
  throw new TypeError('unsupported original value: '+field);
 return claim.value;
}
function sourceUrls(index,ids){
 if(!Array.isArray(ids)||ids.length===0)
  throw new TypeError('documented value must cite original sources');
 return [...new Set(ids.map(id=>{
  const url=index.sources?.[id];
  if(typeof url!=='string'||!url.startsWith('https://'))
   throw new TypeError('invalid original source: '+id);
  return url;
 }))];
}
const positive=x=>Number.isSafeInteger(x)&&x>0;
function sourcedMove(index,entry,slot,template){
 const move=entry.moves[slot],value=clone(template);
 const power=sourcedValue(move.power,slot+'.power',positive);
 const hits=sourcedValue(move.hits,slot+'.hits',positive);
 if(hits>9)throw new TypeError('unsupported original hit count');
 const element=slot==='technique'
  ?sourcedValue(move.element,slot+'.element',x=>x==='fire'):null;
 const refs=new Set(sourceUrls(index,move.labelSourceIds));
 for(const fact of [move.power,move.hits,...(slot==='technique'?[move.element]:[])])
  for(const url of sourceUrls(index,fact.claims[0].sourceIds))refs.add(url);
 Object.assign(value,{
  id:slotId(slot),slot,displayName:move.label,
  category:slot==='attack'?'physical_damage':'technique_damage',
  power,element,targetScope:'single_enemy',
  hitPattern:{type:hits===1?'single':'multi',count:hits},
  statusEffect:null,evidence:'documented',sourceRefs:[...refs]
 });
 // No additional execution, chance or original growth table is invented.
 delete value.execution;
 delete value.level;
 return value;
}

/**
 * Return an immutable catalog with six original playtest rentals PLUS one
 * explicit mixed Jibanyan research actor. The attack 10x2 and Fire 20x1
 * are source-backed. There is intentionally NO original Soultimate/Inspirits
 * claim, because the source pack is disputed/engine-incompatible there.
 */
export function buildJibanyanNormalMoveLab({index=YW2_ORIGINAL_REFERENCE_INDEX}={}){
 const entry=index?.getCharacter?.('yw2:jibanyan');
 if(!entry||entry.id!=='yw2:jibanyan'||entry.game!=='yw2'||
    entry.name!=='ジバニャン')
  throw new TypeError('original Jibanyan source entry is required');
 const base=RENTAL_YOKAI_REFERENCES_LAB[0];
 const attack=sourcedMove(index,entry,'attack',
  RENTAL_LAB_CATALOG.getMove(base.moveIds.attack));
 const technique=sourcedMove(index,entry,'technique',
  RENTAL_LAB_CATALOG.getMove(base.moveIds.technique));
 const stats=Object.fromEntries(props.map(k=>[
  k,sourcedValue(entry.stats[k],'stats.'+k,positive)
 ]));
 const reference=clone(base);
 reference.id=JIBANYAN_NORMAL_TRIAL_ID;
 reference.name='ジバニャン（通常技のみ研究）';
 reference.rank=entry.rank;
 reference.tribe=entry.tribe;
 reference.stats=stats;
 reference.moveIds.attack=attack.id;
 reference.moveIds.technique=technique.id;
 reference.provenance.identity='documented';
 reference.provenance.stats='documented';
 reference.provenance.tribe='documented';
 reference.provenance.rank='documented';
 reference.fieldSourceRefs.identity=sourceUrls(index,entry.identitySourceIds);
 reference.fieldSourceRefs.stats=sourceUrls(index,
  [...new Set(props.flatMap(k=>entry.stats[k].claims[0].sourceIds))]);
 reference.fieldSourceRefs.tribe=[...reference.fieldSourceRefs.identity];
 reference.fieldSourceRefs.rank=[...reference.fieldSourceRefs.identity];
 // Overall four moves and executable skills stay 'fixture': only TWO
 // moves are original; Inspirit/Soultimate and the passive magnitude are NOT.
 reference.provenance.moves='fixture';
 reference.provenance.skill='fixture';
 reference.provenance.personality='fixture';
 const catalog=extendCombatCatalog({
  baseCatalog:RENTAL_LAB_CATALOG,
  characters:[reference],moveMaster:[attack,technique]
 });
 const profile=Object.freeze({
  schema:BATTLE_EXECUTION_PROFILE_SCHEMA_V2,
  characterId:JIBANYAN_NORMAL_TRIAL_ID,
  evidence:'fixture',sourceRefs:[],
  soultimateRank:1,soulCapacity:soulCapacityForRank(1)
 });
 const researchProvenance=Object.freeze({
  originalMoves:Object.freeze(['attack','technique']),
  originalLevel99Stats:true,
  fixtureFields:Object.freeze([
   'personality','actionWeights','loafChance','passiveMagnitudeAndDuration',
   'inspirit','soultimate','soulRank','equipmentAndResistances',
   'hitRngAndDamageFormula','chargeAndAnimationTiming'
  ]),
  originalSoultimateHitCount:null,
  battleReady:false,
  mode:'normal-moves-only-lab'
 });
 return Object.freeze({catalog,profile,researchProvenance,
  characterId:JIBANYAN_NORMAL_TRIAL_ID});
}

/** This must be called explicitly; no live/public match discovers this ID. */
export function compileJibanyanNormalMoveTrialTeams({
 lab=buildJibanyanNormalMoveLab()
}={}){
 const ids=RENTAL_YOKAI_REFERENCES_LAB.map(x=>x.id);
 const selected=[lab.characterId,...ids.slice(1)];
 return compileCatalogTeamsForCombat({
  catalog:lab.catalog,teamCharacterIds:[selected,[...selected].reverse()],
  executionProfiles:{[lab.characterId]:lab.profile}
 });
}
