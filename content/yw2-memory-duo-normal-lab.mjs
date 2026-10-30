/**
 * V3-4-16: source-backed YW2 Wazzat/Houzzat TWO normal moves, level-99
 * reference stats and base action weights, plus their shared verified Skill.
 *
 * The confusion Inspirit and non-damage Soultimate are documented in
 * sourceFacts, but remain unexecuted: combat uses CLEARLY LABELLED rental
 * fixture moves in those two slots. No school lobby/build imports this.
 */
import {createYw2SourceIndex,YW2_SOURCE_INTAKE_SCHEMA}
 from './yw2-source-intake.mjs';
import {YW2_ORIGINAL_REFERENCE_INDEX} from './yw2-original-reference-pack.mjs';
import {RENTAL_YOKAI_REFERENCES_LAB}
 from './rental-yokai-definitions.mjs';
import {RENTAL_LAB_CATALOG,extendCombatCatalog}
 from './combat-catalog.mjs';
import {getYw2OriginalActionSkill}
 from './yw2-original-action-skill-master.mjs';
import {BATTLE_EXECUTION_PROFILE_SCHEMA_V2}
 from '../engine/catalog-battle-profile.mjs';
import {compileCatalogTeamsForCombat}
 from '../engine/catalog-battle-roster.mjs';
import {soulCapacityForRank} from '../engine/soul.mjs';

const A='wazzat_yw2',B='houzzat_yw2';
const links=Object.freeze({
 [A]:'https://www.mtwildwood.net/yw2/yokai/wazzat',
 [B]:'https://www.mtwildwood.net/yw2/yokai/houzzat',
 wazzat_jp:'https://gamepedia.jp/youkai-yw2/monsters/184',
 houzzat_jp:'https://gamepedia.jp/youkai-yw2/monsters/185',
 wazzat_game8:'https://game8.jp/youkai-watch2/497052',
 houzzat_game8:'https://game8.jp/youkai-watch2/496843'
});
const doc=(value,...sourceIds)=>({status:'documented',sourceIds,
 claims:[{value,sourceIds}]});
const unknown=(...sourceIds)=>({status:'unknown',sourceIds,claims:[]});
const move=(label,sourceIds,{power,hits,element,effect,level})=>({
 label,labelSourceIds:sourceIds,power,hits,element,effect,
 ...(level===undefined?{}:{level})
});
const definitions=[
 {schema:YW2_SOURCE_INTAKE_SCHEMA,game:'yw2',
  id:'yw2:wazzat',name:'わすれん帽',rank:'E',tribe:'フシギ',
  identitySourceIds:[A,'wazzat_jp'],
  stats:{
   hp:doc(252,A,'wazzat_game8'),
   strength:doc(76,A,'wazzat_game8'),
   spirit:doc(150,A,'wazzat_game8'),
   defense:doc(87,A,'wazzat_game8'),
   speed:doc(192,A,'wazzat_game8')
  },
  behavior:{baseActionWeights:doc([10,55,30,5],A),
   attitudeOptions:unknown(A),loafWeight:unknown(A)},
  skill:{label:doc('まもりわすれ',A,'wazzat_jp'),
   effect:doc('forgot-to-guard',A,'wazzat_jp')},
  moves:{
   attack:move('かみつく',[A,'wazzat_jp'],{
    power:doc(15,A,'wazzat_jp'),hits:doc(1,A),
    element:unknown(A),effect:unknown(A)
   }),
   technique:move('つむじ風の術',[A,'wazzat_jp'],{
    power:doc(20,A,'wazzat_jp'),hits:doc(1,A),
    element:doc('wind',A,'wazzat_jp'),effect:unknown(A)
   }),
   inspirit:move('記憶を食べる',[A,'wazzat_jp'],{
    power:unknown(A),hits:doc(0,A),element:unknown(A),
    effect:doc('friendly-fire',A,'wazzat_jp'),level:doc(1,A)
   }),
   soultimate:move('スグワスレ〜ル',[A,'wazzat_jp'],{
    power:unknown(A),hits:doc(0,A),element:unknown(A),
    effect:doc('remove-positive-inspirits',A,'wazzat_jp')
   })
  }
 },
 {schema:YW2_SOURCE_INTAKE_SCHEMA,game:'yw2',
  id:'yw2:houzzat',name:'メゾン・ドワスレ',rank:'B',tribe:'フシギ',
  identitySourceIds:[B,'houzzat_jp'],
  stats:{
   hp:doc(332,B,'houzzat_game8'),
   strength:doc(99,B,'houzzat_game8'),
   spirit:doc(187,B,'houzzat_game8'),
   defense:doc(156,B,'houzzat_game8'),
   speed:doc(185,B,'houzzat_game8')
  },
  behavior:{baseActionWeights:doc([5,60,25,10],B),
   attitudeOptions:unknown(B),loafWeight:unknown(B)},
  skill:{label:doc('まもりわすれ',B,'houzzat_jp'),
   effect:doc('forgot-to-guard',B,'houzzat_jp')},
  moves:{
   attack:move('くらいつく',[B,'houzzat_jp'],{
    power:doc(45,B,'houzzat_jp'),hits:doc(2,B),
    element:unknown(B),effect:unknown(B)
   }),
   technique:move('竜巻の術',[B,'houzzat_jp'],{
    power:doc(50,B,'houzzat_jp'),hits:doc(2,B),
    element:doc('wind',B,'houzzat_jp'),effect:unknown(B)
   }),
   inspirit:move('記憶をしまう',[B,'houzzat_jp'],{
    power:unknown(B),hits:doc(0,B),element:unknown(B),
    effect:doc('friendly-fire',B,'houzzat_jp'),level:doc(3,B)
   }),
   soultimate:move('記憶にございません！',[B,'houzzat_jp'],{
    power:unknown(B),hits:doc(0,B),element:unknown(B),
    effect:doc('enemy-front-friendly-fire',B,'houzzat_jp'),level:doc(3,B)
   })
  }
 }
];
export const YW2_MEMORY_DUO_SOURCE_INDEX=createYw2SourceIndex({
 sources:{...YW2_ORIGINAL_REFERENCE_INDEX.sources,...links},
 characters:[...YW2_ORIGINAL_REFERENCE_INDEX.characters,...definitions]
});
export const YW2_MEMORY_DUO_IDS=Object.freeze(['yw2:wazzat','yw2:houzzat']);
const clone=x=>JSON.parse(JSON.stringify(x));
const documented=(fact,label,check)=>{
 if(fact?.status!=='documented'||fact.claims?.length!==1||
   !check(fact.claims[0].value))
  throw new TypeError('uncertified YW2 fact: '+label);
 return fact.claims[0].value;
};
const pos=x=>Number.isSafeInteger(x)&&x>0;
const refs=(index,fact)=>fact.claims[0].sourceIds.map(id=>{
 const url=index.sources[id];
 if(typeof url!=='string'||!url.startsWith('https://'))
  throw new TypeError('bad YW2 reference source '+id);
 return url;
});
const stats=['hp','strength','spirit','defense','speed'];
function compileSlot(index,original,slot,template,researchId){
 const fact=original.moves[slot];
 const power=documented(fact.power,original.id+':'+slot+':power',pos);
 const hits=documented(fact.hits,original.id+':'+slot+':hits',
  x=>pos(x)&&x<=9);
 const element=slot==='technique'?
  documented(fact.element,original.id+':'+slot+':element',x=>x==='wind'):null;
 const r=new Set([...(fact.labelSourceIds.map(id=>index.sources[id])),
  ...refs(index,fact.power),...refs(index,fact.hits),
  ...(slot==='technique'?refs(index,fact.element):[])]);
 return {...clone(template),id:researchId+':'+slot,slot,
  displayName:fact.label,category:slot==='attack'?'physical_damage':
   'technique_damage',power,element,targetScope:'single_enemy',
  hitPattern:{type:hits===1?'single':'multi',count:hits},
  statusEffect:null,evidence:'documented',sourceRefs:[...r]};
}
/**
 * V3-4-18 opt-in source effects: compile only the documented shape, NOT the
 * still-unverified original stick chance, charge timing or status priority.
 * This uses the SAME immutable character and four-move catalog as the rentals.
 */
function compileMemoryStatusSlot(index,original,slot,template,researchId){
 const fact=original.moves[slot],label=original.id+':'+slot;
 const effect=documented(fact.effect,label+':effect',
  v=>slot==='inspirit'?v==='friendly-fire':
    original.id==='yw2:wazzat'?v==='remove-positive-inspirits':
      v==='enemy-front-friendly-fire');
 const level=slot==='inspirit'||effect==='enemy-front-friendly-fire'
  ?documented(fact.level,label+':level',v=>Number.isSafeInteger(v)&&v>=1&&v<=4):null;
 const sources=[...new Set([
  ...fact.labelSourceIds.map(k=>index.sources[k]),
  ...refs(index,fact.effect),...(level===null?[]:refs(index,fact.level))
 ])];
 if(sources.some(v=>typeof v!=='string'||!v.startsWith('https://')))
  throw new TypeError('invalid memory status source URL');
 if(slot==='inspirit')return {...clone(template),id:researchId+':inspirit',
  slot,displayName:fact.label,category:'status_negative',
  power:null,element:null,targetScope:'single_enemy',
  hitPattern:{type:'none',count:0},statusEffect:'friendly-fire',
  level,evidence:'documented',sourceRefs:sources};
 const cleanse=effect==='remove-positive-inspirits';
 const execution=cleanse?{kind:'dispel',scope:'front'}:
  {kind:'debuff',scope:'front',effect:'friendly-fire',level};
 return {...clone(template),id:researchId+':soultimate',
  slot,displayName:fact.label,category:execution.kind,
  power:null,element:null,targetScope:'enemy_front',
  hitPattern:{type:'none',count:0},
  statusEffect:cleanse?null:'friendly-fire',
  execution,evidence:'documented',sourceRefs:sources};
}
/** Build both original normal-move actors via the SAME reusable catalog. */
export function buildYw2MemoryDuoNormalLab({
 index=YW2_MEMORY_DUO_SOURCE_INDEX,includeSourceStatusMoves=false
}={}){
 if(typeof includeSourceStatusMoves!=='boolean')
  throw new TypeError('includeSourceStatusMoves must be boolean');
 const characters=[],moves=[],profiles={},researchIds={};
 for(let i=0;i<YW2_MEMORY_DUO_IDS.length;i++){
  const originalId=YW2_MEMORY_DUO_IDS[i];
  const data=index.getCharacter(originalId);
  const skill=getYw2OriginalActionSkill(originalId);
  if(!data||data.game!=='yw2'||data.id!==originalId||
     data.name!==skill.characterName||data.skill.label.claims?.[0]?.value!==
       skill.skill.displayName||
     documented(data.skill.effect,originalId+':skill',
      x=>x===skill.skill.effect)!==skill.skill.effect)
    throw new TypeError('YW2 source character/Skill identity mismatch: '+originalId);
  const base=RENTAL_YOKAI_REFERENCES_LAB[i],ref=clone(base);
  const id='yw2:memory-normal-lab:'+originalId.split(':')[1];
  researchIds[originalId]=id;
  const physical=compileSlot(index,data,'attack',
   RENTAL_LAB_CATALOG.getMove(base.moveIds.attack),id);
  const technique=compileSlot(index,data,'technique',
   RENTAL_LAB_CATALOG.getMove(base.moveIds.technique),id);
  moves.push(physical,technique);
  const originalInspirit=includeSourceStatusMoves
   ?compileMemoryStatusSlot(index,data,'inspirit',
      RENTAL_LAB_CATALOG.getMove(base.moveIds.inspirit),id):null;
  const originalSpecial=includeSourceStatusMoves
   ?compileMemoryStatusSlot(index,data,'soultimate',
      RENTAL_LAB_CATALOG.getMove(base.moveIds.soultimate),id):null;
  if(originalInspirit&&originalSpecial)moves.push(originalInspirit,originalSpecial);
  ref.id=id;ref.name=data.name+(includeSourceStatusMoves
    ?'（原作4技の効果研究）':'（通常技・共通スキル研究）');
  ref.tribe=data.tribe;ref.rank=data.rank;
  ref.stats=Object.fromEntries(stats.map(k=>[
   k,documented(data.stats[k],id+':'+k,pos)
  ]));
  ref.moveIds.attack=physical.id;
  ref.moveIds.technique=technique.id;
  if(originalInspirit&&originalSpecial){
   ref.moveIds.inspirit=originalInspirit.id;
   ref.moveIds.soultimate=originalSpecial.id;
  }
  ref.personality.actionWeights=[
   ...documented(data.behavior?.baseActionWeights,id+':weights',
    x=>Array.isArray(x)&&x.length===4&&
     x.every(n=>Number.isSafeInteger(n)&&n>=0)&&
     x.reduce((a,b)=>a+b,0)===100)];
  ref.provenance.identity='documented';
  ref.provenance.stats='documented';
  ref.provenance.rank='documented';
  ref.provenance.tribe='documented';
  // A four-move character remains MIXED while Inspirit/Soultimate are fixture.
  ref.provenance.moves='fixture';
  ref.provenance.skill='fixture'; // legacy skill interpreter, NOT original
  ref.provenance.personality='fixture';
  const sources=[
   ...new Set([...data.identitySourceIds.map(k=>index.sources[k]),
    ...stats.flatMap(k=>refs(index,data.stats[k]))])];
  for(const field of ['identity','stats','tribe','rank'])
   ref.fieldSourceRefs[field]=[...sources];
  ref.fieldSourceRefs.personality=refs(index,data.behavior.baseActionWeights);
  characters.push(ref);
  profiles[id]=Object.freeze({
   schema:BATTLE_EXECUTION_PROFILE_SCHEMA_V2,characterId:id,
   evidence:'fixture',sourceRefs:[],soultimateRank:1,
   soulCapacity:soulCapacityForRank(1)
  });
 }
 const catalog=extendCombatCatalog({
  baseCatalog:RENTAL_LAB_CATALOG,characters,moveMaster:moves
 });
 return Object.freeze({catalog,profiles:Object.freeze(profiles),
  researchIds:Object.freeze(researchIds),
  originalSkillId:'yw2:skill:mamoriwasure',
  fixtureSlots:Object.freeze(includeSourceStatusMoves?[
   'personality','loafChance','soulRank','damageFormula','levelGrowth',
   'originalChargeTiming','inspiritStickChance','confusionTargeting'
  ]:['inspirit','soultimate','personality',
   'loafChance','soulRank','damageFormula','levelGrowth']),
  sourceStatusMoves:includeSourceStatusMoves,
  battleReady:false});
}
/** V3-4-18: opt in to all four sourced move EFFECTS, still not battle-ready. */
export function buildYw2MemoryDuoFourMoveLab(options={}){
 return buildYw2MemoryDuoNormalLab({...options,includeSourceStatusMoves:true});
}
/**
 * Compiles actual authored physical/Technique/stat/weights via the existing
 * BattleProfile adapter. The original passive owner identity is sourced by
 * master and passed to the already existing V3-4-15 Combat bridge. No new
 * Skill runtime, no room or custom randomizer.
 */
export function compileYw2MemoryDuoTrialTeams({
 lab=buildYw2MemoryDuoNormalLab()
}={}){
 const rentalIds=RENTAL_YOKAI_REFERENCES_LAB.map(c=>c.id);
 const w=lab.researchIds['yw2:wazzat'],h=lab.researchIds['yw2:houzzat'];
 if(!w||!h)throw new TypeError('both documented source owners required');
 const selected=[w,h,...rentalIds.slice(2)];
 const authored=compileCatalogTeamsForCombat({
  catalog:lab.catalog,teamCharacterIds:[selected,[...selected].reverse()],
  executionProfiles:lab.profiles
 });
 const byLabId=new Map([[w,'yw2:wazzat'],[h,'yw2:houzzat']]);
 return Object.freeze(authored.map((team,side)=>Object.freeze(team.map((member,pos)=>{
  const id=side===0?selected[pos]:selected[5-pos];
  const original=byLabId.get(id);
  if(!original)return member;
  const documentedSkill=getYw2OriginalActionSkill(original);
  if(documentedSkill.skill.id!==lab.originalSkillId)
   throw new TypeError('source passive differs from Wazzat/Houzzat skill');
  return Object.freeze({...member,sourceYw2CharacterId:original});
 }))));
}
