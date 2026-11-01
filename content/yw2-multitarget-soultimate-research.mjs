/**
 * YW2 research only. A reported "Power X x N" and "all enemies" do NOT
 * establish how N strikes are distributed among the three enemy front units.
 *
 * Shogunyan/ブシニャン is an actual dispute, not a ready-to-execute move:
 * Japanese YW2 guides disagree on Power. Mt. Wildwood's long page
 * contains BOTH YW1 and YW2 sections: YW1's 22×9 must NOT be treated as
 * YW2 data. The YW2 section documents 25×9, while Japanese guides
 * document 25×10 or 20×10. The target allocation remains unverified.
 *
 * Nothing here is imported by the Host, rental move master, or Friends mode.
 * Preserve raw sourced claims instead of picking a plausible winner.
 */
const refs=Object.freeze({
 guide:'https://gamepedia.jp/youkai-yw2/specials/3892',
 gamecap:'https://game-cap.com/youkaiwatch2/data/youkai_bushinyan.html',
 gamee:'https://game-e.com/youkai-watch-2/youkai/322.php',
 mined:'https://mtwildwood.net/yw2/yokai/shogunyan'
});
const fact=(status,claims)=>Object.freeze({status,claims:Object.freeze(
 claims.map(x=>Object.freeze({value:x.value,sourceRefs:Object.freeze(
 x.ids.map(id=>refs[id]))}))
)});
const source=Object.freeze({
 id:'yw2:bushinyan:katsuobushi-giri',
 character:'ブシニャン',name:'かつおブシ斬り',slot:'soultimate',
 category:'enemy-front-physical-multiattack',
 power:fact('disputed',[
  {value:25,ids:['guide','gamecap','mined']},
  {value:20,ids:['gamee']}
 ]),
 listedHits:fact('disputed',[
  {value:10,ids:['guide','gamecap','gamee']},
  {value:9,ids:['mined']}
 ]),
 // 22×9 in the SAME online page belongs to the distinct YW1 section.
 excludedOtherGames:Object.freeze([Object.freeze({
  game:'yw1',power:22,listedHits:9,sourceRef:refs.mined,
  reason:'distinct Yo-kai Watch 1 heading; not a YW2 claim'
 })]),
 // No YW2 source yet proves a per-target count, hit selection order,
 // retarget-after-KO or even whether every strike is applied to every foe.
 allocation:Object.freeze({
  status:'unknown',perTargetHits:null,globalHitSequence:null,
  retargetOnKO:null
 }),
 evidence:'disputed-yw2-sources',battleReady:false
});
export const YW2_MULTITARGET_SOULTIMATE_RESEARCH=Object.freeze([source]);
export function yw2MultitargetSoultimateResearch(id){
 return id===source.id?source:null;
}
