/**
 * One authoring source for the six ORIGINAL rental Soultimate moves.
 * Every effect and numeric parameter is a PLAYTEST fixture, not a claim
 * about an original Yo-kai Watch 2 move or verified hit multiplicity.
 *
 * scope controls TARGET SET; hitPattern controls repeated attacks on targets.
 * In this phase damaging moves have UNKNOWN hit counts: legacy simulation
 * currently produces one aggregate impact per selected target, not real hits.
 */
const authored=[
 {kind:'damage',scope:'front',power:100,damageKind:'attack'},
 {kind:'drain',scope:'front',power:80,damageKind:'technique'},
 {kind:'buff',scope:'front',effect:'strength-up',level:2},
 {kind:'damage-status',scope:'one',power:145,
  damageKind:'technique',effect:'spirit-down',level:2},
 {kind:'revive-heal',scope:'team',power:85},
 {kind:'debuff',scope:'front',effect:'defense-down',level:2}
];
const nonDamage=new Set(['heal','buff','debuff','revive','revive-heal']);
const scopeFor=x=>x.kind==='revive-heal'?'ally_team':
 x.kind==='revive'?'single_ally':
 x.kind==='heal'||x.kind==='buff'?'ally_front':
 x.scope==='one'?'single_enemy':'enemy_front';
export const RENTAL_SOULTIMATE_MOVES=Object.freeze(authored.map((raw,i)=>{
 const definition=Object.freeze({...raw});
 return Object.freeze({
  id:'rental-'+String(i+1).padStart(2,'0')+':soultimate',
  slot:'soultimate',
  kind:raw.kind,scope:raw.scope,
  targetScope:scopeFor(raw),
  power:raw.power??null,
  statusEffect:raw.effect??null,
  hitPattern:Object.freeze(nonDamage.has(raw.kind)?
   {type:'none',count:0}:{type:'unknown',count:null}),
  definition,evidence:'fixture',sourceRefs:Object.freeze([])
 });
}));
