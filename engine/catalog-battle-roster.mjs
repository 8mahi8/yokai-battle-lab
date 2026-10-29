/**
 * Engine V3-4-2: read-only validated catalog -> current legacy combat input.
 *
 * At present only the already executable six built-in rental fixtures are
 * CERTIFIED. A newly authored seventh character is a valid catalog entry,
 * not automatically an executable PvP ruleset: Soul rank/capacity, Inspirit
 * level, Soultimate composite plan and passive triggers aren't fully encoded
 * in the generic character/move schema yet. Reject instead of inventing them.
 *
 * No other engine or registry is introduced; combat.mjs and MatchCore remain
 * the sole owners of RNG, targeting, time, HP and effect commits.
 */
import {RENTAL_LAB_CATALOG,RENTAL_SCHOOL_CATALOG}
 from '../content/combat-catalog.mjs';
import {RENTAL_CHARACTER_MOVE_REFS}
 from '../content/rental-character-move-refs.mjs';
import {RENTAL_SQUAD,SCHOOL_RENTAL_PERSONALITIES}
 from '../content/rental-roster.mjs';
import {RENTAL_INSPIRIT_MOVES}
 from '../content/rental-inspirit-moves.mjs';
import {RENTAL_SOULTIMATE_MOVES}
 from '../content/rental-soultimate-moves.mjs';
import {resolveRentalAttackSpec} from './catalog-attack-spec.mjs';
import {resolveRentalTechniqueSpec} from './catalog-technique-spec.mjs';
import {resolveRentalInspiritSpec} from './catalog-inspirit-spec.mjs';
import {resolveRentalSoultimateSpec} from './catalog-soultimate-spec.mjs';
import {resolveRentalSkillSpec} from './catalog-skill-spec.mjs';
import {validateSpecialSpec} from './special-effects.mjs';

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const same=(a,b)=>{
 if(!object(a)||!object(b))return JSON.stringify(a)===JSON.stringify(b);
 const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();
 return JSON.stringify(ka)===JSON.stringify(kb)&&ka.every(k=>
  Array.isArray(a[k])&&Array.isArray(b[k])
   ?JSON.stringify(a[k])===JSON.stringify(b[k])
   :object(a[k])&&object(b[k])?same(a[k],b[k]):a[k]===b[k]);
};
const freezeMember=m=>Object.freeze({...m,
 weights:Object.freeze([...m.weights]),
 ...(m.special?{special:Object.freeze({...m.special})}:{})});

/**
 * teamCharacterIds: two ordered arrays of exactly six certified character IDs.
 * Source order is independent of the six slots; the host assigns A1..A6 and
 * B1..B6 AFTER this conversion. No inferred ID from a name or sprite.
 *
 * The output can be passed as `battleOptions.teams` to createCombat or
 * createMatchProtocol, with their default catalog*Resolution flags off for
 * custom input. No change to online defaults.
 */
export function compileCatalogTeamsForCombat({
 catalog=RENTAL_LAB_CATALOG,teamCharacterIds,school=false
}={}){
 if(typeof school!=='boolean'||!catalog||
    typeof catalog.getCharacter!=='function'||
    typeof catalog.getMove!=='function'||
    typeof catalog.getSkill!=='function'||
    !Array.isArray(teamCharacterIds)||teamCharacterIds.length!==2||
    !teamCharacterIds.every(team=>Array.isArray(team)&&team.length===6&&
      team.every(id=>typeof id==='string'&&id.length>0)&&
      new Set(team).size===6))
  throw new TypeError('two explicit teams of six unique certified character IDs required');
 const standard=school?RENTAL_SCHOOL_CATALOG:RENTAL_LAB_CATALOG;
 const knownIndex=new Map(RENTAL_CHARACTER_MOVE_REFS.map((r,i)=>[r.id,i]));
 const output=teamCharacterIds.map(team=>Object.freeze(team.map(id=>{
  const index=knownIndex.get(id);
  if(index===undefined)
   throw new RangeError('uncertified battle character ID: '+id);
  const author=catalog.getCharacter(id);
  const reference=standard.getCharacter(id);
  if(!author||!reference||!same(author,reference))
   throw new TypeError('battle authoring character differs from certified rental: '+id);
  const skill=catalog.getSkill(author.skill.id);
  if(!skill||!same(skill,standard.getSkill(author.skill.id)))
   throw new TypeError('battle skill differs from certified source: '+id);
  for(const slot of ['attack','technique','inspirit','soultimate']){
   const move=author.moves[slot],source=standard.getMove(move.id);
   if(!source||!same(move,source)||!same(catalog.getMove(move.id),source))
    throw new TypeError('battle move differs from certified source: '+id+'/'+slot);
  }
  const legacy=RENTAL_SQUAD[index];
  // Reuse all five previously tested fail-closed source adapters. These
  // compare the immutable catalog against the executable old fixture.
  const opts={school,catalog};
  const attack=resolveRentalAttackSpec(legacy,index,opts);
  const technique=resolveRentalTechniqueSpec(legacy,index,opts);
  const inspirit=resolveRentalInspiritSpec(legacy,index,opts);
  const knownSpecial=RENTAL_SOULTIMATE_MOVES[index].definition;
  const special=resolveRentalSoultimateSpec({
   ...legacy,special:validateSpecialSpec(knownSpecial)
  },index,opts);
  const passive=resolveRentalSkillSpec(legacy,index,opts);
  if(passive.skillId!==author.skill.id||
     author.moves.attack.id!==attack.moveId||
     author.moves.technique.id!==technique.moveId||
     author.moves.inspirit.id!==inspirit.moveId||
     author.moves.soultimate.id!==special.moveId||
     author.skill.id!==passive.skillId)
   throw new TypeError('authored character slots disagree with executable skills');
  const compiled={
   name:author.name,skill:passive.legacyKey,
   speed:author.stats.speed,maxHp:author.stats.hp,
   strength:author.stats.strength,spirit:author.stats.spirit,
   defense:author.stats.defense,
   attitude:author.personality.attitude,
   weights:[...author.personality.actionWeights],
   ...(school?{loafChance:author.personality.loafChancePercent}:{}),
   attackPower:attack.power,
   ...(attack.hits===1?{}:{attackHits:attack.hits}),
   techniquePower:technique.power,technique:technique.kind,
   ...(technique.hits===null||technique.hits===1?{}:
      {techniqueHits:technique.hits}),
   ...(technique.element==='neutral'?{}:
      {techniqueElement:technique.element}),
   inspirit:inspirit.effect,
   ...(inspirit.level===1?{}:{inspiritLevel:inspirit.level}),
   ...(index===0?{}:{special:knownSpecial})
  };
  // Some Soul capacity, critical defense and research flags still default
  // in buildMember, not in schema V1. Guard byte-for-byte input parity here.
  const expected=school?{...legacy,
   attitude:SCHOOL_RENTAL_PERSONALITIES[index].attitude,
   loafChance:SCHOOL_RENTAL_PERSONALITIES[index].loafChance,
   weights:[...SCHOOL_RENTAL_PERSONALITIES[index].weights]}:legacy;
  if(!same(compiled,expected))
   throw new TypeError('catalog source lacks certified legacy combat fields: '+id);
  return freezeMember(compiled);
 })));
 return Object.freeze(output);
}
