/**
 * Documented YW2 normal-attack SHAPES for isolated research, not certified
 * character deployments. The rental six, original stats, accuracy, damage
 * equation, animations and network battle are entirely independent.
 *
 * Per-target hits are safe for a physical normal attack (one chosen target).
 * NEVER use an all-enemy Soultimate's displayed xN to assume N per target.
 */
const authored=[{
 id:'yw2:bushinyan:senko-giri',actor:'ブシニャン',name:'閃光ぎり',
 slot:'attack',power:20,hitsPerTarget:3,targetScope:'single_enemy',
 evidence:'three-independent-yw2-guides',
 sourceRefs:[
  'https://gamepedia.jp/youkai-yw2/monsters/459',
  'https://game-cap.com/youkaiwatch2/data/youkai_bushinyan.html',
  'https://gameconductor.com/yw2/jiten/detail/?no=353'
 ]
}];
export const YW2_REFERENCE_ATTACKS=Object.freeze(authored.map(move=>
 Object.freeze({...move,sourceRefs:Object.freeze([...move.sourceRefs]),
  rulesStatus:'shape-only; damage-stats-timing-unverified'})));
const byId=new Map(YW2_REFERENCE_ATTACKS.map(move=>[move.id,move]));
export function yw2ReferenceAttack(id){
 if(typeof id!=='string'||!byId.has(id))
  throw new RangeError('unknown YW2 reference normal attack');
 return byId.get(id);
}

/** Only the two documented AUTHORING fields, for an explicit custom test
 * roster. This is never automatically installed into Friends matches. */
export function yw2ReferenceAttackResearchOverride(id){
 const move=yw2ReferenceAttack(id);
 return Object.freeze({attackPower:move.power,attackHits:move.hitsPerTarget});
}
