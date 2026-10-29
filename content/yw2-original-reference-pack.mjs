/**
 * V3-4-5: Initial YW2 reference facts, researched on 2026-10-30.
 * Public fan guides, NOT game assets or verified replays. NO BATTLE LINK.
 *
 * Particularly important: the old Jibanyan Soultimate is 20 x 5 in several
 * Japanese guides but 20 x 7 in Mt. Wildwood (both label their section YW2).
 * Its actual hit count remains DISPUTED, not selected, until tested in-game.
 * Komasan's reported Lv99 stats differ across guide calculation setups.
 */
import {createYw2SourceIndex,YW2_SOURCE_INTAKE_SCHEMA}
 from './yw2-source-intake.mjs';

export const YW2_REFERENCE_SOURCES=Object.freeze({
 jibanyan_guide:'https://gamepedia.jp/youkai-yw2/monsters/272',
 jibanyan_game8:'https://game8.jp/youkai-watch2/497000',
 jibanyan_gamecap:'https://game-cap.com/youkaiwatch2/data/youkai_jibanyan.html',
 jibanyan_mtw:'https://mtwildwood.net/ja/yw2/yokai/jibanyan',
 komasan_guide:'https://gamepedia.jp/youkai-yw2/monsters/279',
 komasan_game8:'https://game8.jp/youkai-watch2/497002',
 komasan_gamecap:'https://game-cap.com/youkaiwatch2/data/youkai_komasan.html',
 komasan_gamedb:'https://gameconductor.com/yw2/jiten/detail/?no=265'
});
const documented=(value,...sourceIds)=>({
 status:'documented',sourceIds,claims:[{value,sourceIds}]
});
const disputed=claims=>({
 status:'disputed',sourceIds:[...new Set(claims.flatMap(c=>c.sourceIds))],
 claims
});
const unknown=(...sourceIds)=>({status:'unknown',sourceIds,claims:[]});
const move=(label,labelSourceIds,{power,hits,element,effect,level=undefined})=>({
 label,labelSourceIds,power,hits,element,effect,
 ...(level===undefined?{}:{level})
});
const G='jibanyan_guide',M='jibanyan_mtw',E='jibanyan_game8';
const K='komasan_guide',D='komasan_gamedb',C='komasan_gamecap',Q='komasan_game8';
const two=(value,a,b)=>documented(value,a,b);
const source=[
 {
  schema:YW2_SOURCE_INTAKE_SCHEMA,game:'yw2',id:'yw2:jibanyan',
  name:'ジバニャン',rank:'D',tribe:'プリチー',
  identitySourceIds:[G,E,M],
  stats:{
   hp:two(322,M,E),strength:two(153,M,E),spirit:two(90,M,E),
   defense:two(108,M,E),speed:two(165,M,E)
  },
  skill:{
   label:documented('まえのめり',G,E),
   // The simpler Japanese description mentions Strength, while Mt.Wildwood
   // additionally specifies Spirit/stages and turns: don't call those proven.
   effect:disputed([
    {value:'敵を倒すと攻撃力が上がる',sourceIds:[G]},
    {value:'敵を倒すとちから・ようりょく2段階、5回の行動',sourceIds:[M]}
   ])
  },
  moves:{
   attack:move('するどいつめ',[G],{
    power:two(10,G,M),hits:documented(2,G),
    element:unknown(G),effect:unknown(G)
   }),
   technique:move('火花の術',[G],{
    power:two(20,G,M),hits:documented(1,G),
    element:documented('fire',G),effect:unknown(G)
   }),
   inspirit:move('しびれるお札',[G],{
    power:unknown(G),hits:documented(0,G),
    element:unknown(G),
    effect:two('speed-down',G,M),level:documented(2,M)
   }),
   soultimate:move('ひゃくれつ肉球',[G],{
    power:two(20,G,M),
    hits:disputed([
     {value:5,sourceIds:[G,'jibanyan_gamecap']},
     {value:7,sourceIds:[M]}
    ]),
    element:unknown(G),effect:two('enemy-front-damage',G,M)
   })
  }
 },
 {
  schema:YW2_SOURCE_INTAKE_SCHEMA,game:'yw2',id:'yw2:komasan',
  name:'コマさん',rank:'D',tribe:'プリチー',
  identitySourceIds:[K,Q,D],
  // Guide "Lv99" values differ and may encode different training, IVs,
  // and baseline conventions. No invented choice for the actual 6v6 rental.
  stats:{
   hp:disputed([{value:310,sourceIds:[Q]},{value:321,sourceIds:[C]}]),
   strength:disputed([{value:103,sourceIds:[Q]},{value:112,sourceIds:[C]}]),
   spirit:disputed([{value:162,sourceIds:[Q]},{value:171,sourceIds:[C]}]),
   defense:disputed([{value:114,sourceIds:[Q]},{value:120,sourceIds:[C]}]),
   speed:disputed([{value:149,sourceIds:[Q]},{value:157,sourceIds:[C]}])
  },
  skill:{
   label:two('「あ」',K,D),
   effect:two('となりにスキル「うん」がいるとようりょく上昇',K,D)
  },
  moves:{
   attack:move('パンチ',[K,D],{
    power:two(15,K,D),hits:documented(1,K),
    element:unknown(K),effect:unknown(K)
   }),
   technique:move('火炎の術',[K,D],{
    power:two(50,K,D),hits:documented(1,K),
    element:documented('fire',K,D),effect:unknown(K)
   }),
   inspirit:move('やけどさせる',[K,D],{
    power:unknown(K),hits:documented(0,K),
    element:unknown(K),effect:two('hp-over-time',K,D)
   }),
   soultimate:move('ひとだま乱舞',[K,D],{
    power:two(100,K,D),hits:documented(1,K),
    element:unknown(K),effect:two('enemy-front-damage',K,D)
   })
  }
 }
];
/** Research-only source index. Never expose this as RENTAL_* or lobby data. */
export const YW2_ORIGINAL_REFERENCE_INDEX=createYw2SourceIndex({
 sources:YW2_REFERENCE_SOURCES,characters:source
});
export const YW2_ORIGINAL_REFERENCE_IDS=Object.freeze(
 YW2_ORIGINAL_REFERENCE_INDEX.characters.map(x=>x.id)
);
