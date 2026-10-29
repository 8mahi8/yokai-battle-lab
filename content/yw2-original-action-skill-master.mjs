/**
 * YW2-only, source-backed Skill identities for original characters.
 * This is an authoring registry, NOT a new passive executor. Effects run
 * through the existing V3-4-14 actionWeights/Skill choice policy.
 *
 * An original's other moves and stats are NOT inferred by this registry.
 * A research proxy may borrow fixture moves, but must label itself as such.
 */
export const YW2_ACTION_SKILL_MASTER_SCHEMA=1;
const owners=Object.freeze([
 Object.freeze({
  characterId:'yw2:wazzat',characterName:'わすれん帽',
  skillId:'yw2:skill:mamoriwasure',
  sourceRefs:Object.freeze([
   'https://www.mtwildwood.net/yw2/yokai/wazzat',
   'https://3dsnote.com/youkai2/wasurenbou/'
  ])
 }),
 Object.freeze({
  characterId:'yw2:houzzat',characterName:'メゾン・ドワスレ',
  skillId:'yw2:skill:mamoriwasure',
  sourceRefs:Object.freeze([
   'https://www.mtwildwood.net/yw2/yokai/houzzat',
   'https://game8.jp/youkai-watch2/496843',
   'https://gamepedia.jp/youkai-yw2/monsters/185'
  ])
 })
]);
const master=Object.freeze([
 Object.freeze({
  schema:YW2_ACTION_SKILL_MASTER_SCHEMA,
  id:'yw2:skill:mamoriwasure',
  displayName:'まもりわすれ',
  effect:'forgot-to-guard',
  activation:'while_alive_including_bench',
  target:'both_teams',
  stacks:false,
  evidence:'documented',
  sourceRefs:Object.freeze([
   'https://www.mtwildwood.net/yw2/yokai/wazzat',
   'https://www.mtwildwood.net/yw2/yokai/houzzat',
   'https://mtwildwood.net/attitudes.php?g=yw2'
  ])
 })
]);
const bySkill=new Map(master.map(s=>[s.id,s]));
const byCharacter=new Map(owners.map(o=>[o.characterId,o]));
export const YW2_SOURCE_ACTION_SKILL_MASTER=master;
export const YW2_SOURCE_ACTION_SKILL_OWNERS=owners;
/** Read-only original passive; no caller may substitute an unsourced Skill. */
export function getYw2OriginalActionSkill(characterId){
 if(typeof characterId!=='string'||!characterId.startsWith('yw2:'))
  throw new TypeError('original YW2 character ID required');
 const owner=byCharacter.get(characterId);
 if(!owner)throw new RangeError('original YW2 Skill owner not documented: '+characterId);
 const skill=bySkill.get(owner.skillId);
 if(!skill||skill.evidence!=='documented'||skill.sourceRefs.length===0||
    owner.sourceRefs.length===0)
  throw new TypeError('source-backed YW2 Skill required');
 return Object.freeze({characterId:owner.characterId,
  characterName:owner.characterName,skill});
}
