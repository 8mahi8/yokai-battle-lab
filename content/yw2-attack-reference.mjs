/**
 * YW2 original normal attack research facts. NEVER deploy these as school
 * rental data or present contested hit count as original verified truth.
 *
 * Japanese YW2 guides report Bushinyan "閃光ぎり" as Power20 × 3.
 * Mt. Wildwood's explicit YW2 heading reports Power20 × 2. On its long
 * multi-game page, do NOT substitute the YW1 heading for YW2.
 *
 * The battle Host's actual damage/accuracy/timing remains a separate study.
 */
const jpSources=Object.freeze([
 'https://gamepedia.jp/youkai-yw2/monsters/459',
 'https://game-cap.com/youkaiwatch2/data/youkai_bushinyan.html',
 'https://gameconductor.com/yw2/jiten/detail/?no=353'
]);
const mtSource='https://mtwildwood.net/yw2/yokai/shogunyan';
const authored=[{
 id:'yw2:bushinyan:senko-giri',actor:'ブシニャン',name:'閃光ぎり',
 slot:'attack',power:20,hitsPerTarget:null,targetScope:'single_enemy',
 hitEvidence:{
  status:'disputed',
  claims:[
   {profile:'jp-guides',value:3,sourceRefs:jpSources},
   {profile:'mtwildwood-yw2',value:2,sourceRefs:[mtSource]}
  ]
 },
 evidence:'disputed-yw2-sources',
 sourceRefs:[...jpSources,mtSource]
}];
export const YW2_REFERENCE_ATTACKS=Object.freeze(authored.map(move=>
 Object.freeze({...move,sourceRefs:Object.freeze([...move.sourceRefs]),
  hitEvidence:Object.freeze({status:move.hitEvidence.status,
   claims:Object.freeze(move.hitEvidence.claims.map(c=>Object.freeze({
    ...c,sourceRefs:Object.freeze([...c.sourceRefs])
   })))
  }),
  rulesStatus:'source-variant-only; hit-count-unverified; damage-stats-timing-unverified'
 })));
const byId=new Map(YW2_REFERENCE_ATTACKS.map(move=>[move.id,move]));
export function yw2ReferenceAttack(id){
 if(typeof id!=='string'||!byId.has(id))
  throw new RangeError('unknown YW2 reference normal attack');
 return byId.get(id);
}
/**
 * The caller MUST select one recorded interpretation for an isolated
 * custom battle experiment. Never silently choose the Japanese majority
 * or a different game's variant. This is NOT a verified original move.
 */
export function yw2ReferenceAttackResearchOverride(id,profile){
 const move=yw2ReferenceAttack(id);
 const claim=move.hitEvidence.claims.find(c=>c.profile===profile);
 if(!claim)throw new RangeError('explicit YW2 source profile required');
 return Object.freeze({attackPower:move.power,attackHits:claim.value});
}
