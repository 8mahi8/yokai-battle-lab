/**
 * Data-only rental character roster.
 * Game balance is a playtest estimate, not a claim about original YW2 stats.
 * "SCHOOL_RENTAL_PERSONALITIES" affects school friend matches ONLY.
 *
 * Adding a character now starts with content data and a content validator;
 * simulation, presentation and network must not each grow a separate roster.
 * Legacy exports continue through engine/combat.mjs for compatibility.
 */
import {RENTAL_ATTACK_MOVES} from './rental-attack-moves.mjs';
import {RENTAL_TECHNIQUE_MOVES} from './rental-technique-moves.mjs';
import {RENTAL_INSPIRIT_MOVES} from './rental-inspirit-moves.mjs';
import {RENTAL_SOULTIMATE_MOVES} from './rental-soultimate-moves.mjs';

export const RENTAL_SQUAD = Object.freeze([
  {name:'あかねこ',skill:'momentum',speed:210,maxHp:225,strength:105,spirit:55,defense:73,attitude:'grouchy',weights:[60,25,10,5]},
  {name:'こもれび',skill:'critImmune',speed:170,maxHp:210,strength:55,spirit:125,defense:65,attitude:'gentle',weights:[25,55,15,5],
},
  {name:'いしもり',skill:'lastStand',speed:105,maxHp:310,strength:92,spirit:45,defense:145,attitude:'careful',weights:[35,10,15,40],
},
  {name:'すずかぜ',skill:'sharpCrit',speed:251,maxHp:190,strength:73,spirit:115,defense:55,attitude:'grouchy',weights:[35,50,10,5],
},
  {name:'ほたる',skill:'care',speed:195,maxHp:220,strength:66,spirit:112,defense:72,attitude:'gentle',weights:[30,50,15,5],
},
  {name:'くろがね',skill:'guardBreak',speed:128,maxHp:305,strength:116,spirit:47,defense:130,attitude:'grouchy',weights:[60,10,10,20],
}
].map((member,index)=>Object.freeze({
 ...member,
 // Slot 1 retains the legacy implicit default. Others are generated
 // from the ONLY Soultimate source, never re-authored on the character.
 ...(index===0?{}:{special:RENTAL_SOULTIMATE_MOVES[index].definition}),
 attackPower:RENTAL_ATTACK_MOVES[index].power,
 ...(RENTAL_ATTACK_MOVES[index].hits===1?{}:{attackHits:RENTAL_ATTACK_MOVES[index].hits}),
 techniquePower:RENTAL_TECHNIQUE_MOVES[index].power,
 technique:RENTAL_TECHNIQUE_MOVES[index].kind,
 inspirit:RENTAL_INSPIRIT_MOVES[index].effect,
 ...(RENTAL_INSPIRIT_MOVES[index].level===1?{}:
    {inspiritLevel:RENTAL_INSPIRIT_MOVES[index].level}),
 ...(RENTAL_TECHNIQUE_MOVES[index].hits===null||
    RENTAL_TECHNIQUE_MOVES[index].hits===1?{}:
    {techniqueHits:RENTAL_TECHNIQUE_MOVES[index].hits}),
 ...(RENTAL_TECHNIQUE_MOVES[index].element==='neutral'?{}:
    {techniqueElement:RENTAL_TECHNIQUE_MOVES[index].element})
})));

export const SCHOOL_RENTAL_PERSONALITIES=Object.freeze([
 {attitude:'grouchy',weights:[50,20,25,5],loafChance:3},  // physical attacker
 {attitude:'gentle',weights:[10,65,20,5],loafChance:2},  // healing technique / ally buff
 {attitude:'careful',weights:[15,10,20,55],loafChance:1}, // protective guard
 {attitude:'brainy',weights:[15,65,15,5],loafChance:3},  // offensive technique
 {attitude:'gentle',weights:[10,65,20,5],loafChance:2},  // healing / support
 {attitude:'cruel',weights:[25,10,55,10],loafChance:5}   // negative Inspirit
]);
// Original YW2 separates seriousness (loafing) from action preference.
 // The 1-5% per-action odds here are SCHOOL PLAYTEST GUESSES, not researched
 // original YW2 probability. Previously online loafing was disabled outright.
// Original YW2 attitude categories are documented; these six numeric weights
// are school-playtest estimates, NOT original internals. Preserve legacy rental
// fixture for deterministic research comparisons.
