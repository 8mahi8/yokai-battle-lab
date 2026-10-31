/**
 * YW2-original Soultimate REFERENCE SHAPES for the opt-in CUSTOM lab only.
 * Sources establish actor/move, displayed Lv1 Power, target scope and hit
 * multiplicity. They do NOT establish live damage RNG/visual timing/AI.
 * No copyrighted sprites, audio, video or original move effects copied.
 *
 * The original rental roster and all production Friends battles ignore this.
 */
const authored=[
 {id:'yw2:tararin:hanaji-bomber',name:'鼻血ボンバー',actor:'たらりん',
  power:100,kind:'damage',scope:'front',damageKind:'attack',
  targetScope:'enemy_front',hitsPerTarget:1,
  effects:[],sourceRefs:[
   'https://gamepedia.jp/youkai-yw2/specials/3820',
   'https://game-cap.com/youkaiwatch2/data/youkai_tararin.html'
  ]},
 {id:'yw2:ookuwano-kami:daisetsudan',name:'大切断',actor:'オオクワノ神',
  power:210,kind:'damage',scope:'one',damageKind:'attack',
  targetScope:'single_enemy',hitsPerTarget:1,
  effects:[],sourceRefs:[
   'https://gamepedia.jp/youkai-yw2/specials/3607',
   'https://game-e.com/youkai-watch-2/youkai/037.php'
  ]}
];
export const YW2_REFERENCE_SOULTIMATES=Object.freeze(authored.map(x=>Object.freeze({
 ...x,effects:Object.freeze([...x.effects]),
 sourceRefs:Object.freeze([...x.sourceRefs]),
 evidence:'two-independent-yw2-guides',rulesStatus:'shape-only'
})));
const byId=new Map(YW2_REFERENCE_SOULTIMATES.map(x=>[x.id,x]));
export function yw2ReferenceSoultimate(id){
 if(typeof id!=='string'||!byId.has(id))
  throw new RangeError('unknown YW2 reference Soultimate');
 return byId.get(id);
}
/**
 * Isolated definition bridge: preserves the preexisting research engine
 * validator, but never imports an unsourced original hit count.
 */
export function yw2ReferenceSpecialDefinition(id){
 const m=yw2ReferenceSoultimate(id);
 return Object.freeze({
  kind:m.kind,scope:m.scope,power:m.power,damageKind:m.damageKind
 });
}
