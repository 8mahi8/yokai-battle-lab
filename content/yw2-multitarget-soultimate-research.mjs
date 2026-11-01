/**
 * YW2 research only. A reported "Power X x N" and "all enemies" do NOT
 * establish how N strikes are distributed among the three enemy front units.
 *
 * Shogunyan/ブシニャン is an actual dispute, not a ready-to-execute move:
 * Japanese game guides disagree on Power, and Mt. Wildwood's mined YW2
 * numbers disagree on both power and hit count.
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
  {value:25,ids:['guide','gamecap']},
  {value:20,ids:['gamee']},
  {value:22,ids:['mined']}
 ]),
 listedHits:fact('disputed',[
  {value:10,ids:['guide','gamecap','gamee']},
  {value:9,ids:['mined']}
 ]),
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
/** Bridge intentionally cannot fabricate a Host execution spec.
 * Return null until both numeric conflict and target assignment are proven. */
export function yw2MultiTargetSoultimateExecutableSpec(id){
 const move=yw2MultitargetSoultimateResearch(id);
 if(!move||move.power.status!=='documented'||
    move.listedHits.status!=='documented'||
    move.allocation.status!=='documented')return null;
 // This collection currently contains NO executable source-backed moves.
 return null;
}
