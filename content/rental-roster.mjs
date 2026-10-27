/**
 * Data-only rental character roster.
 * Game balance is a playtest estimate, not a claim about original YW2 stats.
 * "SCHOOL_RENTAL_PERSONALITIES" affects school friend matches ONLY.
 *
 * Adding a character now starts with content data and a content validator;
 * simulation, presentation and network must not each grow a separate roster.
 * Legacy exports continue through engine/combat.mjs for compatibility.
 */
export const RENTAL_SQUAD = Object.freeze([
  {name:'あかねこ',skill:'momentum',speed:210,maxHp:225,strength:105,spirit:55,defense:73,attackPower:55,techniquePower:45,technique:'damage',attitude:'grouchy',inspirit:'sleep',weights:[60,25,10,5]},
  {name:'こもれび',skill:'critImmune',speed:170,maxHp:210,strength:55,spirit:125,defense:65,attackPower:40,techniquePower:50,technique:'heal',attitude:'gentle',inspirit:'strength-up',weights:[25,55,15,5],
   special:{kind:'drain',scope:'front',power:80,damageKind:'technique'}},
  {name:'いしもり',skill:'lastStand',speed:105,maxHp:310,strength:92,spirit:45,defense:145,attackPower:45,techniquePower:35,technique:'damage',attitude:'careful',inspirit:'strength-up',weights:[35,10,15,40],
   special:{kind:'buff',scope:'front',effect:'strength-up',level:2}},
  {name:'すずかぜ',skill:'sharpCrit',speed:251,maxHp:190,strength:73,spirit:115,defense:55,attackPower:45,techniquePower:65,technique:'damage',attitude:'grouchy',inspirit:'sleep',weights:[35,50,10,5],
   special:{kind:'damage-status',scope:'one',power:145,damageKind:'technique',effect:'spirit-down',level:2}},
  {name:'ほたる',skill:'care',speed:195,maxHp:220,strength:66,spirit:112,defense:72,attackPower:45,techniquePower:50,technique:'heal',attitude:'gentle',inspirit:'strength-up',weights:[30,50,15,5],
   special:{kind:'revive-heal',scope:'team',power:85}},
  {name:'くろがね',skill:'guardBreak',speed:128,maxHp:305,strength:116,spirit:47,defense:130,attackPower:65,techniquePower:25,technique:'damage',attitude:'grouchy',inspirit:'sleep',weights:[60,10,10,20],
   special:{kind:'debuff',scope:'front',effect:'defense-down',level:2}}
]);

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
