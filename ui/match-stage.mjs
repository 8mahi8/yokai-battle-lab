/**
 * Phase 14 — original responsive battle stage.
 * Pure DOM renderer shared by offline host research and Firebase SDK seats.
 * Consumes ONLY the canonical createMatchProtocol().snapshot() wire format.
 * The combat engine, turn scheduler, gesture rules and Soul are never cloned.
 * No CSS imports, network connection, timers or hidden actions.
 */
import {renderSpiritPortrait} from './character-art.mjs';
import {wheelAngle,wheelGestureAt} from './wheel-gesture.mjs';
import {latestBattleCue,visualReactionClass} from './battle-vfx.mjs';
import {collectNewBattleCues,MAX_VISUAL_CATCHUP_CUES,actionForVisibleCue} from './battle-cue-sequence.mjs';
import {passiveSkillNoticesForAction} from './passive-feedback.mjs';
import {soultimateDisplayTitle} from '../content/presentation-labels.mjs';
import {yw2ReferenceSoultimate} from '../content/yw2-soultimate-reference.mjs';
import {planActionChoreography,choreographyFrame} from '../presentation/action-choreography.mjs';
import {createSeatMotionVisibility} from './seat-motion-visibility.mjs';
import {projectLegacyAttackOutcome} from '../presentation/legacy-attack-outcome.mjs';
import {projectAttackOutcomeV2} from '../presentation/legacy-attack-to-v2.mjs';
import {projectSoultimateImpactLedger} from '../contracts/soultimate-impact-ledger-v1.mjs';
import {projectSoultimateHitLedger} from '../contracts/soultimate-hit-ledger-v1.mjs';
import {soultimateReadiness} from './soultimate-ready.mjs';
import {matchAckMessage,matchRuleFailureMessage} from './match-feedback.mjs';
const ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,ch=>ESC[ch]);
const pct=(value,max)=>Math.max(0,Math.min(100,Math.round(100*value/(max||1))));
const LABELS={rotate:'回転',pin:'ピン',watch:'ウォッチ切替',
 chargeStart:'必殺チャージ',purifyStart:'おはらい',pokeStart:'つつく',
 chargeCancel:'必殺中止',purifyCancel:'おはらい中止',pokeCancel:'つつく中止'};
const SLOTS=[{x:17,y:32},{x:50,y:20},{x:83,y:32},
 // Medals stay in the physical wheel circle; top/bottom cards are not clipped.
 {x:83,y:72},{x:50,y:79},{x:17,y:72}];
const INSTRUCTIONS={
 spin:'円に沿って指を回そう',tap:'光る玉をタップ',trace:'光る点を順番になぞろう',
 align:'時計の針を目的の数字へ回そう',pop:'紫の玉をタップ',
 mash:'中心を連続タップ',rub:'左右にこすろう',slash:'横方向に斬ろう',
 poke:'対象を素早くつつこう'
};
const ACTION_KIND={charge:'chargeInput',purify:'purifyInput',poke:'pokeInput'};
const CANCEL_KIND={charge:'chargeCancel',purify:'purifyCancel',poke:'pokeCancel'};

/**
 * Read-only SVG guides derived from the actual input trial snapshot.
 * Never decide gesture success here; only the imported combat engine does.
 */
export function gestureGuideHTML(kind,challenge={}){
 const safePoint=value=>Array.isArray(value)&&value.length===2&&
  value.every(n=>Number.isFinite(n)&&n>=0&&n<=1);
 const point=value=>[value[0]*100,value[1]*100];
 if(kind==='align'&&Number.isInteger(challenge.clockNumber)&&
  challenge.clockNumber>=1&&challenge.clockNumber<=12){
  const target=challenge.clockNumber;
  const targetAngle=-Math.PI/2+(target%12)*Math.PI/6;
  const angle=Number.isFinite(challenge.handAngle)?challenge.handAngle:-Math.PI/2;
  const tx=50+32*Math.cos(targetAngle),ty=50+32*Math.sin(targetAngle);
  const hx=50+32*Math.cos(angle),hy=50+32*Math.sin(angle);
  const nums=Array.from({length:12},(_,i)=>{
   const n=i+1,a=-Math.PI/2+n*Math.PI/6;
   const x=50+40*Math.cos(a),y=50+40*Math.sin(a);
   return '<text x="'+x+'" y="'+(y+1.5)+'" font-size="6" text-anchor="middle" fill="'+
    (n===target?'#ffe093':'#bdcfdc')+'">'+n+'</text>';
  }).join('');
  return '<svg class="mb-gesture-svg" viewBox="0 0 100 100" aria-hidden="true">'+
   '<circle cx="50" cy="50" r="33" fill="none" stroke="#a9c5cf" stroke-width="1.4"/>'+
   nums+'<circle cx="'+tx+'" cy="'+ty+'" r="6" fill="#f4cb6b" opacity=".55"/>'+
   '<line x1="50" y1="50" x2="'+hx+'" y2="'+hy+
   '" stroke="#f8e2ac" stroke-width="3" stroke-linecap="round"/>'+
   '<circle cx="50" cy="50" r="4" fill="#fff0c8"/></svg>';
 }
 if(kind==='slash'&&Array.isArray(challenge.slashPoints)){
  const count=Number.isSafeInteger(challenge.count)?challenge.count:0;
  const paths=challenge.slashPoints.map((pair,i)=>{
   if(!Array.isArray(pair)||!pair.every(safePoint))return '';
   const [start,end]=pair.map(point);
   const color=i<count?'#8da5af':i===count?'#fbd897':'#a0a9b8';
   return '<line x1="'+start[0]+'" y1="'+start[1]+'" x2="'+end[0]+'" y2="'+end[1]+
    '" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/>'+
    '<circle cx="'+start[0]+'" cy="'+start[1]+'" r="4" fill="'+color+'"/>'+
    '<text x="'+(start[0]-8)+'" y="'+(start[1]+2)+'" fill="#f0e1bf" font-size="6">'+(i+1)+'</text>';
  }).join('');
  return '<svg class="mb-gesture-svg" viewBox="0 0 100 100" aria-hidden="true">'+paths+'</svg>';
 }
 if(kind==='trace'&&Array.isArray(challenge.path)){
  const path=challenge.path.filter(safePoint);
  if(!path.length)return '';
  return '<svg class="mb-gesture-svg" viewBox="0 0 100 100" aria-hidden="true">'+
   '<polyline points="'+path.map(x=>point(x).join(',')).join(' ')+
   '" stroke="#a7cfcf" stroke-width="2.5" stroke-dasharray="3 2" fill="none"/>'+
   path.map((p,i)=>{const xy=point(p);return '<circle cx="'+xy[0]+'" cy="'+xy[1]+
    '" r="'+(i===challenge.pathIndex?6:3.5)+'" fill="'+(i===challenge.pathIndex?'#f9d28b':'#9cd6d8')+'"/>';}).join('')+
   '</svg>';
 }
 return '';
}

export function makeStageView(state,side=0){
 if(side!==0&&side!==1)throw new RangeError('seat must be 0 or 1');
 if(!state||!state.game||!Array.isArray(state.game.squads)||!Array.isArray(state.game.clock?.teams))
  throw new TypeError('canonical game snapshot required');
 const game=state.game;
 const teams=[0,1].map(index=>{
  const clock=game.clock.teams[index],roster=game.squads[index];
  const bank=game.soul.teams[index];
  const readiness=soultimateReadiness(game,index);
  const front=new Set(clock.frontIds);
  const members=roster.map((unit,idx)=>{
   const soul=bank.find(x=>x.id===unit.id)||{soul:0,capacity:100};
   return {id:unit.id,name:unit.name,hp:unit.hp,maxHp:unit.maxHp,
    skill:unit.skill??null,skillBoost:game.skillBoosts?.[unit.id]?.remainingTurns??0,
    soul:soul.soul,capacity:soul.capacity,
    specialReady:readiness[unit.id]?.ready??false,
    front:front.has(unit.id),ko:unit.hp<=0,
    negative:(game.inspirits[unit.id]||[]).some(x=>x.sign==='negative'),
    positive:(game.inspirits[unit.id]||[]).some(x=>x.sign==='positive'),
    slot:(idx-clock.offset+6)%6};
  });
  return {side:index,members,frontIds:clock.frontIds,benchIds:clock.benchIds,
   mode:game.soul.modes[index],pin:game.pins[index]};
 });
 let gesture=null;
 const guided=game.guided?.[side],purify=game.purification?.[side],
  poke=game.poke?.active?.[side];
 if(guided)gesture={kind:'charge',id:guided.id,challenge:guided.challenge};
 else if(purify)gesture={kind:'purify',id:purify.id,challenge:purify.challenge};
 else if(poke)gesture={kind:'poke',id:poke.targetId,challenge:poke.challenge};
 // Only the presentation view receives the catalog projection. Never alter
 // the host's canonical event array, RNG, Soul, HP, or wire fingerprint.
 const live=(game.events?.slice(-20)||[]).map(event=>{
  const projection=projectLegacyAttackOutcome(event,game.squads);
  const actionOutcomeV2=projectAttackOutcomeV2(event,game.squads);
  const specialImpactLedger=projectSoultimateImpactLedger(event);
  const specialHitLedger=projectSoultimateHitLedger(event);
  return projection||actionOutcomeV2||specialImpactLedger||specialHitLedger?{...event,
   ...(projection?{attackProjection:projection}:{}),
   ...(actionOutcomeV2?{actionOutcomeV2}:{}),
   ...(specialImpactLedger?{specialImpactLedger}:{}),
   ...(specialHitLedger?{specialHitLedger}:{})
  }:event;
 });
 const roster=teams[side];
 return {revision:state.revision,turn:game.clock.turn,winner:game.winner,
  side,teams,gesture,events:live,forecast:state.forecast||[],
  activeMode:roster.mode,pin:roster.pin,clientSequences:state.clientSequences||[0,0]};
}
/**
 * Presentation-only selectable IDs. The authoritative battle engine always
 * validates the actual move (including Soul, Poke status and action timing).
 * This is only a visual affordance, never gameplay permission.
 */
export function matchSelectionHints(view,mode){
 if(!view||![null,'charge','purify','target'].includes(mode))
  throw new TypeError('invalid battle selection state');
 if(mode===null)return {own:[],enemy:[],message:''};
 const own=view.teams[view.side],opponent=view.teams[1-view.side];
 if(mode==='charge'){
  const ready=own.members.filter(m=>m.front&&!m.ko&&m.specialReady).map(m=>m.id);
  return {own:ready,enemy:[],
   message:ready.length?(own.mode==='zero'?
     'GわざOK：妖気満タンの3体組から選ぼう':
     'わざOK：妖気満タンの妖怪を選ぼう'):
    (own.mode==='zero'?'Gわざを使える妖怪はいません':
     'わざを使える妖怪はいません')};
 }
 if(mode==='purify'){
  const ownIds=own.members.filter(m=>!m.front&&!m.ko&&m.negative).map(m=>m.id);
  return {own:ownIds,enemy:[],message:ownIds.length?
   'おはらい：悪いとりつきを受けた後衛を選ぼう':
   'おはらいが必要な後衛はいません'};
 }
 return {own:[],enemy:opponent.members.filter(m=>m.front&&!m.ko).map(m=>m.id),
  message:own.mode==='zero'?'つつく：相手の前衛を選ぼう（とりつき等の条件が必要）':
    'ねらう：相手の前衛を選ぼう'};
}

/** Winner comes only from the authoritative host snapshot, never from
 * estimating the opponent's visible HP or independent guest simulation. */
export function projectMatchResult(winner,seat){
 if(seat!==0&&seat!==1)throw new RangeError('invalid result seat');
 if(winner===null)return null;
 if(winner!==0&&winner!==1)throw new RangeError('invalid winner');
 const didWin=winner===seat;
 return {winner,seat,didWin,title:didWin?'勝利！':'敗北…',
  winnerLabel:'PLAYER '+(winner===0?'A':'B')+' の勝ち',
  description:didWin?'相手の妖怪6体がすべて気絶しました。':'自分の妖怪6体がすべて気絶しました。'};
}

export function createMatchStage({element,onAction,onStep=()=>{},
 seat=null,onError=()=>{},showResearchForecast=false,
 researchOpponentVisibility=false}={}){
 if(!element||typeof element.addEventListener!=='function')throw new TypeError('root DOM element required');
 if(typeof onAction!=='function'||typeof onStep!=='function'||typeof onError!=='function')
  throw new TypeError('callbacks required');
 if(seat!==null&&seat!==0&&seat!==1)throw new RangeError('seat must be null, 0 or 1');
 if(typeof researchOpponentVisibility!=='boolean')
  throw new TypeError('researchOpponentVisibility must be boolean');
 const fixedSeat=seat;
 let activeSeat=seat??0,wireState=null,view=null,selection=null;
 let recentMessage='準備中',pointer=null,lastMove=0;
 let wheelPointer=null,suppressWheelClick=false,wheelClickTimer=null;
 let seenCueKey=null,flash=null,scenePlan=null,scenePhase='done',sceneStartedAt=0,sceneTimer=null,lastEventId=0;
 let pendingCues=[]; // read-only display queue; never delays authoritative host
 let sceneHitIndex=null; // presentation only: index into host-confirmed attack hits
 let sceneSpecialTargetIndex=null; // resolved target, not a hit count
 let sceneSpecialHitIndex=null; // custom host hit, never target count
 const stagedHealth=new Map();
 const opponentVisibility=researchOpponentVisibility?[
  createSeatMotionVisibility({seat:0}),createSeatMotionVisibility({seat:1})]:null;
 let commandMode=null,battleDrawCache=null,resultDismissed=false;
 // Host-only completion event drives owner-local feedback; never a tap ACK.
 let lastPurificationId=null,purificationFeedback=null,purificationTimer=null;
 const teamDrawCache=[null,null];let forecastDrawCache=null;
 element.innerHTML=`
 <div class="mb-stage mb-yw2">
  <header class="mb-topbar">
   <div class="mb-title-group"><span class="mb-mark">◈</span><div>
    <small>CIRCLE BATTLE / ORIGINAL INSPIRED LAYOUT</small>
    <h1>輪戦 <span>—</span> サークルバトル</h1></div></div>
   <div class="mb-state"><span id="mb-connection" class="mb-online">LOCAL</span><span>行動 <b id="mb-turn">0</b></span></div>
  </header>
  <div class="mb-disclaimer">妖怪ウォッチ2対戦の再現研究中。キャラはオリジナル。必殺技の威力・技ごとの効果は研究用仮値で、原作再現は未完了。</div>
  <div class="mb-dualscreen">
   <section class="mb-upper-screen" aria-label="上画面：戦闘フィールド">
    <div class="mb-screen-caption">BATTLE FIELD <span id="mb-choice-status" role="status">上画面 / 前衛3体ずつ</span></div>
    <div class="mb-battle-backdrop">
     <div class="mb-scenery mb-scenery-back" aria-hidden="true"></div>
     <div id="mb-special-flare" class="mb-special-flare" hidden aria-hidden="true">
      <div class="mb-special-cutin-lines"></div>
      <div id="mb-special-portrait" class="mb-special-portrait"></div>
      <div class="mb-special-copy"><small id="mb-special-actor"></small><span id="mb-special-title"></span></div>
     </div>
     <div class="mb-foe-line" id="mb-foe-line"></div><div id="mb-action-callout" class="mb-action-callout" hidden><b id="mb-cue-kind"></b><span id="mb-cue-summary"></span></div><div id="mb-passive-notice" class="mb-passive-notice" hidden aria-live="off"></div>
     <div class="mb-scenery mb-scenery-floor" aria-hidden="true"></div>
     <div class="mb-ally-line" id="mb-ally-line"></div>
    </div>
    <div class="mb-action-label" id="mb-action-label" aria-live="polite">次の行動を待機中</div>
    <div class="mb-forecast-section">
     <div class="mb-section-label"><b>次の5行動</b><span>研究用の予測表示</span></div>
     <div class="mb-forecast" id="mb-forecast"></div>
    </div>
   </section>
   <section class="mb-lower-screen" aria-label="下画面：メダルサークルとコマンド">
    <div class="mb-command-head mb-lower-title">
     <div><b id="mb-active-label">PLAYER A の操作</b><small id="mb-selected">妖怪を選択してください</small></div>
     <div class="mb-seat-switch" id="mb-seat-switch"><button type="button" data-seat="0" class="is-active">A</button>
      <button type="button" data-seat="1">B</button></div>
    </div>
    <div class="mb-command-field">
     <div class="mb-command-column mb-command-left">
      <button type="button" data-act="charge" id="mb-charge" class="mb-watch-command mb-command-skill"><span>わざ</span><small>必殺技</small></button>
      <button type="button" data-act="purify" id="mb-purify" class="mb-watch-command mb-command-purify"><span>おはらい</span><small>状態を回復</small></button>
     </div>
     <div class="mb-wheel-shell">
      <div class="mb-wheel-host">
       <div id="mb-team0" class="mb-team mb-side0"></div>
       <div id="mb-team1" class="mb-team mb-side1" hidden></div>
      </div>
      <div class="mb-wheel-turn"><button type="button" data-rotate="-1" class="mb-big" aria-label="サークル左回転">◀ 左回転</button>
       <span>前衛 / 後衛</span>
       <button type="button" data-rotate="1" class="mb-big" aria-label="サークル右回転">右回転 ▶</button></div>
     </div>
     <div class="mb-command-column mb-command-right">
      <button type="button" data-act="target" id="mb-target" class="mb-watch-command mb-command-target"><span>ねらう</span><small>ピンで狙う</small></button>
      <button type="button" disabled class="mb-watch-command mb-command-item" title="公式対戦ルールではアイテムを使えません"><span>アイテム</span><small>対戦では使用不可</small></button>
     </div>
    </div>
    <div class="mb-command-footer">
     <button type="button" data-act="watch" id="mb-watch" hidden tabindex="-1" aria-hidden="true">零式へ切替</button>
     <button type="button" data-act="pin-clear">ピン解除</button>
     <button type="button" data-act="mode-cancel" id="mb-mode-cancel">選択をやめる</button>
     <span class="mb-footnote" id="mb-mode-hint">サークルで前衛を回転できます</span>
    </div>
    <div class="mb-feed"><div class="mb-feed-heading"><b>戦況</b><button type="button" id="mb-step" data-step="1">研究用：次の行動 ▶</button></div>
     <div class="mb-activity" id="mb-activity" aria-live="polite">読み込み中</div>
     <div class="mb-feed-list" id="mb-feed-list"></div>
     <small class="mb-revision" id="mb-revision">REV 0</small>
    </div>
  <div class="mb-modal" id="mb-modal" hidden>
   <div class="mb-modal-surface" role="dialog" aria-modal="false" aria-label="タッチ操作">
    <div class="mb-command-head"><b id="mb-gesture-title">操作</b><button type="button" data-act="cancel">中止 ✕</button></div>
    <p id="mb-gesture-help">指で操作</p>
    <div class="mb-touch-pad" id="mb-touch-pad"><div id="mb-touch-points"></div></div>
    <div class="mb-meter"><i id="mb-gesture-bar"></i></div>
    <small id="mb-gesture-progress"></small>
   </div>
  </div>
  <div class="mb-purify-complete" id="mb-purify-complete" role="status" aria-live="polite" hidden>
   <span class="mb-purify-complete-icon" aria-hidden="true">✧</span>
   <strong>おはらい完了！</strong>
   <small id="mb-purify-complete-target">悪いとりつきが消えた！</small>
  </div>
   </section>
  </div>
  <section class="mb-finish-screen" id="mb-finish-screen" hidden role="status" aria-live="polite" aria-label="対戦結果">
   <div class="mb-finish-card">
    <span class="mb-finish-eyebrow">MATCH RESULT</span>
    <h2 id="mb-finish-title">勝敗</h2>
    <b id="mb-finish-winner"></b>
    <p id="mb-finish-description"></p>
    <p class="mb-finish-help">もう一度対戦する場合は、ページを開き直して新しい部屋を作ってください。</p>
    <button type="button" data-act="result-close" class="mb-finish-close">試合結果を閉じて戦況を見る</button>
   </div>
  </section>

 </div>`;
 const $=id=>element.querySelector('#'+id);
 // Presentation-only clock. All authoritative results already come from host.
 const showImpact=()=>scenePhase==='impact'||scenePhase==='recovery';
 const visibleHit=id=>{
  if(!showImpact())return null;
  if(flash?.type==='action'&&scenePlan?.hitResults?.length){
   const h=scenePlan.hitResults[sceneHitIndex??0];
   return h?.targetId===id?{id,hit:h.hit,kind:'damage',amount:h.damage}:null;
  }
  if(flash?.type==='special'&&scenePlan){
   if(scenePlan.specialHitLedger&&sceneSpecialHitIndex!==null){
    const hit=scenePlan.specialHitLedger.hits[sceneSpecialHitIndex];
    return hit?.targetId===id?{id,kind:'damage',amount:hit.damage,hit:hit.hit}:null;
   }
   const current=scenePlan.impacts[sceneSpecialTargetIndex??0];
   return sceneSpecialTargetIndex!==null&&current?.targetId===id?
    {id,kind:current.effect,amount:current.amount,hit:current.hit}:null;
  }
  return flash?.targets?.find(x=>x.id===id)??null;
 };
 const shownHp=unit=>{
  if(flash?.type==='action'&&scenePlan?.hitResults?.length){
   const first=scenePlan.hitResults[0];
   if(first.targetId===unit.id){
    if(!showImpact())return first.hpBefore;
    return scenePlan.hitResults[sceneHitIndex??0].hpAfter;
   }
  }
  if(flash?.type==='special'&&scenePlan){
   if(scenePlan.specialHitLedger){
    const rows=scenePlan.specialHitLedger.hits.filter(h=>h.targetId===unit.id);
    if(rows.length){
     if(!showImpact()||sceneSpecialHitIndex===null)return rows[0].hpBefore;
     const preceding=scenePlan.specialHitLedger.hits.slice(0,sceneSpecialHitIndex+1)
      .filter(h=>h.targetId===unit.id);
     return preceding.length?preceding.at(-1).hpAfter:rows[0].hpBefore;
    }
   }
   const hostRows=scenePlan.specialImpactLedger?.impacts||[];
   const matches=hostRows.filter(row=>row.targetId===unit.id);
   if(matches.length){
    // Pre/post HP is an actual host impact record. Avoid using a stale
    // previous snapshot when a guest reconnects or many events arrive.
    if(!showImpact()||sceneSpecialTargetIndex===null)
     return matches[0].hpBefore;
    const processed=hostRows.slice(0,sceneSpecialTargetIndex+1)
     .filter(row=>row.targetId===unit.id);
    return processed.length?processed.at(-1).hpAfter:matches[0].hpBefore;
   }
   // Older pre-contract events still render with the previous-view fallback.
   if(stagedHealth.has(unit.id)){
    const first=scenePlan.impacts.findIndex(x=>x.targetId===unit.id);
    if(first!==-1&&(!showImpact()||sceneSpecialTargetIndex===null||
       first>sceneSpecialTargetIndex))return stagedHealth.get(unit.id);
   }
  }
  return !showImpact()&&stagedHealth.has(unit.id)?stagedHealth.get(unit.id):unit.hp;
 };
 function cancelScene(){
  clearTimeout(sceneTimer);sceneTimer=null;flash=null;scenePlan=null;
  scenePhase='done';sceneHitIndex=null;sceneSpecialTargetIndex=null;
  sceneSpecialHitIndex=null;stagedHealth.clear();
  if(opponentVisibility)for(const gate of opponentVisibility)gate.finish();
 }
 function advanceScene(){
  if(!scenePlan)return;
  if(document.hidden){cancelScene();if(wireState)render(wireState);return;}
  const elapsed=Math.max(0,performance.now()-sceneStartedAt);
  const frame=choreographyFrame(scenePlan,elapsed);
  opponentVisibility?.[activeSeat].advance(elapsed);
  if(frame.finished){
   cancelScene();
   if(!document.hidden&&pendingCues.length)beginScene(pendingCues.shift(),null);
   if(wireState)render(wireState);
   return;
  }
  const changed=frame.phase!==scenePhase||frame.hitIndex!==sceneHitIndex||
   frame.specialTargetIndex!==sceneSpecialTargetIndex||
   frame.specialHitIndex!==sceneSpecialHitIndex;
  scenePhase=frame.phase;
  sceneHitIndex=frame.hitIndex;
  sceneSpecialTargetIndex=frame.specialTargetIndex;
  sceneSpecialHitIndex=frame.specialHitIndex;
  if(changed&&wireState)render(wireState);
  if(!scenePlan)return;
  const next=scenePlan.phases.find(p=>p.endMs>elapsed);
  const at=Math.min(next?.endMs??Infinity,frame.nextHitAtMs??Infinity,
   frame.nextSpecialImpactAtMs??Infinity,frame.nextSpecialHitAtMs??Infinity);
  clearTimeout(sceneTimer);
  if(Number.isFinite(at))sceneTimer=setTimeout(advanceScene,Math.max(8,at-elapsed+1));
 }
 function beginScene(cue,previousView){
  cancelScene();
  if(document.hidden)return;
  try{scenePlan=planActionChoreography(cue);}
  catch(error){onError(error);cancelScene();return;}
  flash=cue;scenePhase='anticipation';sceneHitIndex=null;
  sceneSpecialTargetIndex=null;sceneSpecialHitIndex=null;
  sceneStartedAt=performance.now();
  // Only the opponent's visual wheel/charge is held, never the host truth.
  opponentVisibility?.[activeSeat].begin({eventKey:cue.key,
   durationMs:scenePlan.durationMs,view:previousView??view});
  for(const impact of cue.targets||[]){
   const side=impact.id?.startsWith('B')?1:0;
   const old=previousView?.teams?.[side]?.members.find(m=>m.id===impact.id);
   if(old)stagedHealth.set(old.id,old.hp);
  }
  sceneTimer=setTimeout(advanceScene,scenePlan.phases[0].endMs+1);
 }
 function onSceneVisibility(){
  if(document.hidden){
   pendingCues=[]; // suspended iframe must not replay stale cues
   if(scenePlan){cancelScene();if(wireState)render(wireState);}
  }
  else if(scenePlan)advanceScene();
 }
 // A five-next-action forecast is a developer research aid, NOT an original
 // Yo-kai Watch 2 PvP screen feature. Default battle must never display it.
 element.querySelector('.mb-forecast-section').hidden=!showResearchForecast;
 function alert(text){recentMessage=String(text);$('mb-activity').textContent=recentMessage;}
 function command(intent){
  if(!wireState){alert('戦闘がまだ始まっていません');return;}
  if(view.winner!==null){alert('試合が終了しています');return;}
  try{
   const value=onAction(activeSeat,intent);
   if(value&&typeof value.then==='function'){
    value.then(result=>report(result,intent)).catch(err=>{onError(err);alert(err.message);});
   }else report(value,intent);
  }catch(err){onError(err);alert(err.message);}
 }
 function report(result,intent){
  if(result?.ok===false){
   const reason=result.result?.reason||result.reason||'rule_rejected';
   alert(matchRuleFailureMessage(reason,result.result?.remainingMs??result.remainingMs));return;
  }
  if(result?.queued)alert('入力を順番待ちに追加（残り '+result.position+' 件）');
  else if(result?.accepted===true){
   // A revision proves the host consumed a command; it is NOT evidence
   // that a partial touch completed the charge. Use its rule result.
   const outcome=result.result;
   alert(matchAckMessage({clientSeq:result.clientSeq,accepted:true,
    applied:outcome?.ok===true?true:outcome?.ok===false?false:null,
    commandType:intent.type,
    ...(typeof outcome?.completed==='boolean'?{completed:outcome.completed}:{})
   }));
  }else if(result?.clientSeq)alert('入力 '+result.clientSeq+' を送信 / ACK待ち');
 }
 function teamHTML(t){
  const chunks=t.members.map(unit=>{
   const pos=SLOTS[unit.slot];
   const selected=selection===unit.id&&t.side===activeSeat?' mb-selected':'';
   const choice=commandMode&&t.side===activeSeat&&matchSelectionHints(view,commandMode).own.includes(unit.id)
    ?' mb-choice-eligible':'';
   const pinned=t.side!==activeSeat&&unit.id===view.teams[activeSeat].pin?' mb-pinned':'';
   const disabled=shownHp(unit)===0?' mb-ko':'';
   const impact=visibleHit(unit.id);
   const animated=flash?.actor===unit.id?' mb-acting':impact?' '+visualReactionClass(impact):'';
   const benched=unit.front?'':' mb-bench';
   const ineligible=commandMode&&t.side===activeSeat&&!choice?' mb-choice-ineligible':'';
   const name=escapeHTML(unit.name);
   return '<button type="button" data-unit="'+unit.id+'" class="mb-creature'+selected+pinned+disabled+animated+benched+choice+ineligible+
    '" style="--x:'+pos.x+'%;--y:'+pos.y+'%" aria-label="'+name+(unit.front?' 前衛':' 後衛')+'">'+
    renderSpiritPortrait(unit.id)+
    '<span class="mb-name">'+name+'</span>'+
    '<span class="mb-bars"><i style="width:'+pct(shownHp(unit),unit.maxHp)+'%"></i></span>'+
    '<span class="mb-bars mb-soulbar"><i style="width:'+pct(unit.soul,unit.capacity)+'%"></i></span>'+
    '<span class="mb-unit-stat">'+shownHp(unit)+'/'+unit.maxHp+(unit.negative?' ⚠':'')+'</span>'+
    (unit.front?'<span class="mb-front-badge">前衛</span>':'')+
    (commandMode==='charge'&&unit.specialReady?
     '<span class="mb-special-ready">'+(t.mode==='zero'?'GわざOK':'わざOK')+'</span>':'')+
    (impact&&impact.amount>0
     ?'<span class="mb-floating-number">'+(impact.kind==='heal'||impact.kind==='revive'?'+':'−')+impact.amount+'</span>':
      impact&&impact.hit===false?'<span class="mb-floating-number">MISS</span>':'')+
    '</button>';
  }).join('');
  return '<div class="mb-team-heading"><span class="mb-team-icon">'+(t.side===0?'A':'B')+'</span>'+
   '<div><b>PLAYER '+(t.side===0?'A':'B')+'</b><small>妖怪6体 / '+(t.mode==='zero'?'零式':'標準')+'ウォッチ</small></div>'+
   '<span class="mb-team-control-indicator">'+(activeSeat===t.side?'操作中':'')+'</span></div>'+
   '<div class="mb-wheel"><div class="mb-wheel-ring"></div>'+
   '<button type="button" data-act="watch" class="mb-center-symbol" title="中央でウォッチ切替" aria-label="ウォッチ切替・現在'+(t.mode==='zero'?'零式':'標準')+'">'+
   (t.mode==='zero'?'零式':'標準')+'</button>'+chunks+'</div>';
 }
 function frontlineHTML(team,isOwn){
  return team.frontIds.map(id=>{
   const unit=team.members.find(m=>m.id===id);
   if(!unit)return '';
   const name=escapeHTML(unit.name);
   const actor=flash?.actor===id?' mb-acting':'';
   const impact=visibleHit(id);
   const target=impact?' '+visualReactionClass(impact):'';
   const pinned=!isOwn&&view.teams[activeSeat].pin===id?' mb-pinned':'';
   const candidate=!isOwn&&commandMode==='target'&&!unit.ko?' mb-choice-eligible':'';
   const tonedDown=!isOwn&&commandMode==='target'&&unit.ko?' mb-choice-ineligible':'';
   const ko=shownHp(unit)===0?' mb-ko':'';
   const status=(unit.positive?'<span class="mb-condition-icon" aria-label="良いとりつき">↑</span>':'')+
    (unit.negative?'<span class="mb-condition-icon" aria-label="悪いとりつき">⚠</span>':'');
   return '<button type="button" data-unit="'+id+'" class="mb-fighter'+
    actor+target+pinned+ko+candidate+tonedDown+'" aria-label="'+name+
    (isOwn?' 味方前衛':' 敵前衛')+(candidate?' 選択可能':'')+
    (pinned?' ピンでねらい中':'')+(unit.negative?' 悪いとりつき':unit.positive?' 良いとりつき':'')+'">'+
    '<span class="mb-fighter-sprite">'+renderSpiritPortrait(id)+'</span>'+
    (pinned?'<span class="mb-pin-reticle" aria-hidden="true"></span>':'')+
    (unit.negative?'<span class="mb-status-marker mb-status-bad" aria-hidden="true">✕</span>':
     unit.positive?'<span class="mb-status-marker mb-status-good" aria-hidden="true">↑</span>':'')+
    '<span class="mb-fighter-meta"><strong>'+name+'</strong>'+
    '<span class="mb-bars"><i style="width:'+pct(shownHp(unit),unit.maxHp)+'%"></i></span>'+
    (isOwn?'<span class="mb-bars mb-soulbar"><i style="width:'+pct(unit.soul,unit.capacity)+'%"></i></span>':'')+
    '<small>'+shownHp(unit)+'/'+unit.maxHp+'</small>'+status+'</span>'+
    (impact&&(impact.kind==='buff'||impact.kind==='debuff'||impact.kind==='revive')&&impact.hit!==false?
     '<span class="mb-floating-number">'+(impact.kind==='buff'?'強化':impact.kind==='revive'?'復活':'弱体化')+'</span>':
     impact&&impact.amount>0?
     '<span class="mb-floating-number">'+(impact.kind==='heal'?'+':'−')+impact.amount+'</span>':
     impact&&impact.hit===false?'<span class="mb-floating-number">MISS</span>':'')+
    '</button>';
  }).join('');
 }
 function forecastHTML(){
  if(!view.forecast.length)return '<div class="mb-empty">次の行動を予測できません</div>';
  return view.forecast.slice(0,5).map((action,index)=>{
   const char=view.teams[action.id?.startsWith('A')?0:1].members.find(x=>x.id===action.id);
   return '<div class="mb-next"><span class="mb-num">'+String(index+1).padStart(2,'0')+'</span>'+
    '<span class="mb-next-avatar '+(action.id?.startsWith('A')?'mb-a':'mb-b')+'">'+
     renderSpiritPortrait(action.id,{mini:true})+'</span>'+
    '<div><strong>'+escapeHTML(char?.name||action.id)+'</strong><small>予測順 '+(index+1)+'</small></div></div>';
  }).join('');
 }
 function feedHTML(){
  const logs=view.events.slice(-4).reverse();
  if(!logs.length)return '<div class="mb-feed-empty">次の行動を押すと戦闘が進みます</div>';
  return logs.map(x=>{
   const person=x.actor||x.id||x.targetId||'';
   const pokeReward=x.type==='poke'?x.reward:null;
   const pokeLabels={'playtest-soul-transfer':'妖気吸収',
     'playtest-damage':'HPダメージ','playtest-heavy-hit':'一撃（999）',
     'research-soul-transfer':'妖気吸収'};
   const type=x.type==='skill'?('スキル '+(x.label||x.skill||'')+' '+(x.kind||'発動')):
     pokeReward?'つつく / '+(pokeLabels[pokeReward.kind]||'結果未確定'):
     x.kind||x.type||'行動';
   const number=pokeReward&&Number.isFinite(pokeReward.amount)?
     ' / '+pokeReward.amount:
     Number.isFinite(x.amount)?' / '+x.amount:'';
   return '<div><span>'+escapeHTML(person)+'</span> '+escapeHTML(type)+number+'</div>';
  }).join('');
 }
 function modal(){
  const x=view.gesture,outer=$('mb-modal');
  if(!x){outer.hidden=true;pointer=null;return;}
  outer.hidden=false;
  const kind=x.kind==='poke'?'poke':x.challenge?.kind||x.kind;
  $('mb-gesture-title').textContent=(x.kind==='charge'?'必殺':x.kind==='purify'?'おはらい':'つつく')+' / '+x.id;
  $('mb-gesture-help').textContent=INSTRUCTIONS[kind]||'画面をタッチして進めよう';
  const progress=Math.max(0,Math.min(100,Math.round((x.challenge?.progress||0)*100)));
  $('mb-gesture-bar').style.width=progress+'%';
  $('mb-gesture-progress').textContent=progress+'% 完了（試験用の入力条件）';
  const challenge=x.challenge||{};
  let points='';
  if(kind==='tap'&&Array.isArray(challenge.target)){
   points='<span class="mb-touch-target" style="left:'+(challenge.target[0]*100)+'%;top:'+(challenge.target[1]*100)+'%"></span>';
  }else if(kind==='pop'&&Array.isArray(challenge.popPoints)){
   points=challenge.popPoints.map(([px,py],i)=>'<span class="mb-touch-target" style="left:'+(px*100)+'%;top:'+(py*100)+'%;opacity:'+(challenge.popped?.includes(i)?'.2':'1')+'"></span>').join('');
  }else if(kind==='align'||kind==='slash'||kind==='trace'){
   points=gestureGuideHTML(kind,challenge);
  }else points='<span class="mb-touch-guideline">'+(kind==='spin'?'↻':kind==='rub'?'↔':'✦')+'</span>';
  $('mb-touch-points').innerHTML=points;
 }
 function render(state){
  const previousView=view;
  wireState=state;
  view=makeStageView(state,activeSeat);
  // Only newly delivered authoritative purification events activate feedback.
  // Initial attach may contain a past event: never replay it on join.
  const past=view.events.filter(e=>e.type==='purification'&&
    Number.isSafeInteger(e.eventId)&&e.eventId>0);
  const newest=past.reduce((m,e)=>Math.max(m,e.eventId),0);
  if(lastPurificationId===null){
   lastPurificationId=newest;
  }else if(newest>lastPurificationId){
   const done=past.filter(e=>e.eventId>lastPurificationId&&e.side===activeSeat&&
     Array.isArray(e.removed)&&e.removed.length>0).at(-1);
   lastPurificationId=newest;
   if(done&&!view.gesture){
    clearTimeout(purificationTimer);
    purificationFeedback={targetId:done.targetId,eventId:done.eventId};
    purificationTimer=setTimeout(()=>{
     purificationFeedback=null;purificationTimer=null;
     const notice=$('mb-purify-complete');
     if(notice)notice.hidden=true;
    },1150); // research visual interval, not confirmed original duration
   }
  }
  if(view.gesture||view.winner!==null){
   clearTimeout(purificationTimer);purificationTimer=null;
   purificationFeedback=null;
  }
  if(view.winner===null)resultDismissed=false;
  if(view.winner!==null){
   const outcome=projectMatchResult(view.winner,activeSeat);
   $('mb-finish-title').textContent=outcome.title;
   $('mb-finish-winner').textContent=outcome.winnerLabel;
   $('mb-finish-description').textContent=outcome.description;
  }
  $('mb-finish-screen').hidden=view.winner===null||resultDismissed;
  element.dataset.matchFinished=String(view.winner!==null);
  // A batched host update may be newer than the FIFO scene on screen.
  // Resolve the label from the cue AFTER processing its sequence below.
  let action=null;
  const cue=latestBattleCue(view.events);
  const seen=collectNewBattleCues(view.events,lastEventId);
  const maxId=seen.latestEventId;
  // A newly restarted match has an empty event log (maxId=0). Do not
  // carry the last match's opponent freeze or animation into the new match.
  if(maxId<lastEventId&&(maxId>0||view.revision===0)){
   cancelScene();pendingCues=[];seenCueKey=null;lastEventId=0;
  }
  // Initial attach shows current truth; old events must not replay on join.
  if(seenCueKey===null){
   seenCueKey=cue?.key??'initial';
   lastEventId=maxId;
  }else if(maxId>0){
   if(maxId>lastEventId){
    lastEventId=maxId;
    if(!document.hidden&&seen.cues.length){
     if(seen.skipped>0){
      // Huge sync jump: skip old visuals, show the latest meaningful action.
      // The live host snapshot is already authoritative. Do not spend many
      // seconds replaying outdated actions (or hide its real passive notice).
      pendingCues=[];cancelScene();
      beginScene(seen.cues.at(-1),null); // no trustworthy pre-hit HP after an event gap
     }else{
      pendingCues.push(...seen.cues);
      if(pendingCues.length>MAX_VISUAL_CATCHUP_CUES)
       pendingCues=pendingCues.slice(-MAX_VISUAL_CATCHUP_CUES);
      if(!scenePlan)beginScene(pendingCues.shift(),previousView);
     }
    }
    if(seen.cues.length)seenCueKey=seen.cues.at(-1).key;
   }
  }else if(cue&&cue.key!==seenCueKey){
   // Backward-compatible old snapshots lacking host event IDs.
   seenCueKey=cue.key;
   beginScene(cue,previousView);
  }
  action=actionForVisibleCue(view.events,flash);
  const shownView=opponentVisibility?.[activeSeat].project(view)??view;
  const backdrop=element.querySelector('.mb-battle-backdrop');
  backdrop.dataset.opponentViewBlocked=String(
   opponentVisibility?.[activeSeat].status().blocked??false);
  backdrop.dataset.sceneKind=scenePlan?.kind??'none';
  backdrop.dataset.scenePhase=scenePhase;
  // Machine-readable evidence of the actual move connected through the
  // renderer. Do not display internal IDs as if they were original move names.
  backdrop.dataset.moveId=scenePlan?.moveId??'';
  backdrop.dataset.recordedHits=String(scenePlan?.hitResults?.length??0);
  backdrop.dataset.outcomeSchema=String(scenePlan?.actionOutcomeV2?.schema??'');
  backdrop.dataset.activeHit=sceneHitIndex===null?'':String(sceneHitIndex+1);
  backdrop.dataset.specialTargetIndex=sceneSpecialTargetIndex===null?'':
   String(sceneSpecialTargetIndex+1);
  backdrop.dataset.specialTargetCount=scenePlan?.kind==='special'?
   String(scenePlan.impacts.length):'';
  backdrop.dataset.specialImpactSchema=String(scenePlan?.specialImpactLedger?.schema??'');
  backdrop.dataset.specialHitSchema=String(scenePlan?.specialHitLedger?.schema??'');
  backdrop.dataset.specialHitIndex=sceneSpecialHitIndex===null?'':String(sceneSpecialHitIndex+1);
  // Passive Skill events are resolved by the host. During the impact/recovery
  // phase, explain any automatically applied ability without a fake attack.
  const notice=$('mb-passive-notice');
  const displayActionId=flash?.type==='action'&&flash.key?.startsWith('event:')
   ?Number(flash.key.slice(6)):null;
  const skillNotes=showImpact()&&displayActionId!==null
   ?passiveSkillNoticesForAction(view.events,displayActionId):[];
  notice.hidden=skillNotes.length===0;
  if(skillNotes.length){
   const labelName=id=>view.teams[id?.startsWith('B')?1:0]?.members.find(u=>u.id===id)?.name||'妖怪';
   notice.textContent=skillNotes.map(n=>labelName(n.actorId)+' '+n.label+
     (n.targetId?' → '+labelName(n.targetId):'')).join(' / ');
  }else notice.textContent='';
  const specialVisible=flash?.type==='special'&&scenePhase==='anticipation';
  const cutin=$('mb-special-flare');
  cutin.hidden=!specialVisible;
  if(specialVisible){
   const id=flash.actor;
   const actor=view.teams[id?.startsWith('B')?1:0]?.members.find(x=>x.id===id);
   const portrait=$('mb-special-portrait');
   if(portrait.dataset.unit!==id){
    portrait.innerHTML=id?renderSpiritPortrait(id):'';
    portrait.dataset.unit=id??'';
   }
   cutin.dataset.creature=String(Number(id?.slice(1))||1);
   cutin.dataset.mode=flash.mode==='g-tech'?'g':'normal';
   $('mb-special-actor').textContent=(actor?.name??'妖怪')+' / '+(flash.mode==='g-tech'?'Gわざ':'必殺技');
  }
  const callout=$('mb-action-callout');
  if(flash){
   const names={attack:'こうげき！',technique:'ようじゅつ！',heal:'かいふく！',inspirit:'とりつく！',guard:'ガード！',loaf:'サボり…',poke:'つつく！',special:'ひっさつわざ！'};
   const caster=view.teams[flash.actor?.startsWith('B')?1:0]?.members.find(u=>u.id===flash.actor);
   const impact=showImpact()?
    (scenePlan?.hitResults?.length&&sceneHitIndex!==null?
      visibleHit(scenePlan.hitResults[sceneHitIndex].targetId):
      flash.type==='special'&&sceneSpecialTargetIndex!==null?
       flash.targets?.[sceneSpecialTargetIndex]:flash.targets?.[0]):null;
   const victim=impact&&view.teams[impact.id?.startsWith('B')?1:0]?.members.find(u=>u.id===impact.id);
   $('mb-cue-kind').textContent=flash.mode==='g-tech'?'Gわざ！':names[flash.kind]||names[flash.type]||'行動';
   $('mb-cue-summary').textContent=(caster?.name||'')+(victim?' → '+victim.name:'')+
     (impact?.hit===false?' ミス！':impact?.amount>0?' '+impact.amount:'');
   callout.dataset.kind=flash.kind||flash.type;
   // Soultimates already have their own prominent full-field cut-in.
   // Do not overlay a second announcement on top of the named special.
   callout.hidden=flash.type==='special';
  }else callout.hidden=true;
  $('mb-special-title').textContent=flash?.type==='special'?
   flash.referenceSoultimate?
    '原作技の研究：'+yw2ReferenceSoultimate(flash.referenceSoultimate.id).name:
    soultimateDisplayTitle(flash.actor):'';

  const own=view.teams[activeSeat];
  if(!own.members.some(x=>x.id===selection))selection=own.frontIds[0];
  $('mb-turn').textContent=String(view.turn);
  $('mb-team0').hidden=activeSeat!==0;
  $('mb-team1').hidden=activeSeat!==1;
  const fieldKey=JSON.stringify({side:activeSeat,own:shownView.teams[activeSeat],
   enemy:shownView.teams[1-activeSeat],flash,phase:scenePhase,hitIndex:sceneHitIndex,
   specialTargetIndex:sceneSpecialTargetIndex,specialHitIndex:sceneSpecialHitIndex,
   staged:[...stagedHealth],commandMode});
  if(fieldKey!==battleDrawCache){
   $('mb-foe-line').innerHTML=frontlineHTML(shownView.teams[1-activeSeat],false);
   $('mb-ally-line').innerHTML=frontlineHTML(shownView.teams[activeSeat],true);
   battleDrawCache=fieldKey;
  }
  // Touch challenges may send many authoritative snapshots per second.
  // The SVG cards must not be torn down for each tiny touch update.
  for(let index=0;index<2;index++){
   const key=JSON.stringify({team:shownView.teams[index],seat:activeSeat,selection,
    ownerPin:view.teams[activeSeat].pin,flash,phase:scenePhase,hitIndex:sceneHitIndex,
    specialTargetIndex:sceneSpecialTargetIndex,specialHitIndex:sceneSpecialHitIndex,
   staged:[...stagedHealth],commandMode});
   if(key!==teamDrawCache[index]&&!(wheelPointer&&wheelPointer.seat===index)){
    $('mb-team'+index).innerHTML=teamHTML(shownView.teams[index]);
    teamDrawCache[index]=key;
   }
  }
  const forecastKey=JSON.stringify(view.forecast);
  if(forecastKey!==forecastDrawCache){
   $('mb-forecast').innerHTML=forecastHTML();
   forecastDrawCache=forecastKey;
  }
  if(flash?.type==='poke'){
   const labels={'playtest-soul-transfer':'妖気吸収','playtest-damage':'HPダメージ',
     'playtest-heavy-hit':'一撃（999）','research-soul-transfer':'妖気吸収（研究）'};
   $('mb-action-label').textContent='つつく / '+(labels[flash.rewardKind]||'結果未確定')+
    (showImpact()&&flash.amount>0?' '+flash.amount:'');
  }else if(flash?.type==='special'){
   const caster=view.teams[flash.actor?.startsWith('B')?1:0]?.members.find(u=>u.id===flash.actor);
   $('mb-action-label').textContent=(caster?.name||'妖怪')+' / '+
    (flash.mode==='g-tech'?'Gわざ':'ひっさつわざ')+'発動';
  }else if(action){
   const actor=view.teams[action.actor?.startsWith('B')?1:0]?.members.find(u=>u.id===action.actor);
   const target=view.teams[action.target?.startsWith('B')?1:0]?.members.find(u=>u.id===action.target);
   const kindNames={attack:'攻撃',technique:'妖術',inspirit:'とりつき',guard:'ガード',heal:'回復',loaf:'サボり'};
   $('mb-action-label').textContent=(actor?.name||action.actor||'妖怪')+' → '+(target?.name||'行動')+
    ' / '+(kindNames[action.kind]||action.kind)+(showImpact()&&
    flash?.type==='action'&&action.hit===false?'（ミス）':
    showImpact()&&flash?.type==='action'&&action.amount>0?' '+action.amount:'');
  }else $('mb-action-label').textContent='次の行動を待機中';
  $('mb-active-label').textContent='PLAYER '+(activeSeat?'B':'A')+' の操作';
  const selected=own.members.find(x=>x.id===selection);
  $('mb-selected').textContent=selected?'選択: '+selected.name+(selected.front?' / 前衛':' / 後衛')+
    (selected.skill?' / スキル '+({momentum:'撃破時強化',care:'隣接回復',sharpCrit:'会心率UP',critImmune:'会心無効',lastStand:'一度HP1で耐える',guardBreak:'ガード貫通'}[selected.skill]||'未確認'):'')+
    (selected.skillBoost?' / 強化残'+selected.skillBoost+'行動':''):'妖怪を選択';
  $('mb-watch').textContent=own.mode==='zero'?'標準ウォッチへ':'零式へ切替';
  $('mb-charge').querySelector('span').textContent=own.mode==='zero'?'Gわざ':'わざ';
  $('mb-charge').querySelector('small').textContent=own.mode==='zero'?
   '自分と両隣の妖気を使用':'ひっさつわざ';
  $('mb-target').querySelector('span').textContent=own.mode==='zero'?'つつく':'ねらう';
  $('mb-target').querySelector('small').textContent=own.mode==='zero'?'敵をつつく':'敵にピンを刺す';
  $('mb-charge').classList.toggle('mb-command-active',commandMode==='charge');
  $('mb-purify').classList.toggle('mb-command-active',commandMode==='purify');
  $('mb-target').classList.toggle('mb-command-active',commandMode==='target');
  $('mb-choice-status').textContent=commandMode?matchSelectionHints(view,commandMode).message:
   '上画面 / 前衛3体ずつ';
  element.querySelector('.mb-upper-screen').dataset.selecting=commandMode??'';
  element.querySelector('.mb-upper-screen').dataset.targetKind=own.mode==='zero'?'poke':'pin';
  for(const [name,modeName] of [['mb-charge','charge'],['mb-purify','purify'],['mb-target','target']]){
   $(''+name).setAttribute('aria-pressed',String(commandMode===modeName));
  }
  $('mb-mode-cancel').disabled=commandMode===null;
  $('mb-mode-hint').textContent=commandMode?matchSelectionHints(view,commandMode).message:
    own.mode==='zero'?'零式モード：つつくは条件がそろった敵に使用'
    :'指でサークルを回転・中央タップで零式切替';
  $('mb-activity').textContent=recentMessage;
  $('mb-feed-list').innerHTML=feedHTML();
  $('mb-revision').textContent='REV '+view.revision+' / A '+view.clientSequences[0]+' ・ B '+view.clientSequences[1];
  $('mb-seat-switch').hidden=fixedSeat!==null;
  element.querySelectorAll('[data-seat]').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.seat)===activeSeat));
  $('mb-step').disabled=(fixedSeat!==null&&activeSeat!==0)||view.winner!==null;
  modal();
  const purifyNotice=$('mb-purify-complete');
  purifyNotice.hidden=!purificationFeedback||!!view.gesture||view.winner!==null;
  if(!purifyNotice.hidden){
   const target=view.teams[activeSeat].members.find(m=>m.id===purificationFeedback.targetId);
   $('mb-purify-complete-target').textContent=
    (target?.name||'妖怪')+'の悪いとりつきが消えた！';
   purifyNotice.dataset.eventId=String(purificationFeedback.eventId);
  }else delete purifyNotice.dataset.eventId;
  if(view.winner!==null&&recentMessage!==projectMatchResult(view.winner,activeSeat).winnerLabel)
   alert(projectMatchResult(view.winner,activeSeat).winnerLabel);
  element.dataset.stageReady='true';
  element.dataset.stageRevision=String(view.revision);
 }
 function sendGesture(type,coords=null){
  if(!view?.gesture)return;
  const input={type,...(coords?{x:coords.x,y:coords.y}:{})};
  command({type:ACTION_KIND[view.gesture.kind],gesture:input});
 }
 function coords(event,pad){
  const r=pad.getBoundingClientRect();
  return {x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),
   y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))};
 }
 function handleClick(event){
  const b=event.target.closest('button');
  if(suppressWheelClick&&b?.closest('.mb-wheel')&&!b.matches('.mb-center-symbol')){
   suppressWheelClick=false;
   event.preventDefault();return;
  }
  if(!b||!element.contains(b)||!view)return;
  if(b.dataset.act==='result-close'&&view.winner!==null){
   resultDismissed=true;$('mb-finish-screen').hidden=true;return;
  }
  if(b.dataset.seat!==undefined){
   if(fixedSeat!==null)return;
   activeSeat=Number(b.dataset.seat);selection=null;commandMode=null;
   battleDrawCache=null;render(wireState);return;
  }
  // Ended matches are fully read-only, even after dismissing the overlay.
  if(view.winner!==null)return;
  if(b.dataset.unit){
   const clicked=b.dataset.unit;
   if(clicked.startsWith(activeSeat===0?'A':'B')){
    const ally=view.teams[activeSeat].members.find(m=>m.id===clicked);
    if(!ally)return;
    selection=clicked;
    if(commandMode==='charge'){
     if(!ally.front||ally.ko||!ally.specialReady){
      alert('必殺技は「'+(view.activeMode==='zero'?'GわざOK':'わざOK')+
       '」の前衛妖怪を選んでね');render(wireState);return;
     }
     commandMode=null;command({type:'chargeStart',id:clicked});
    }else if(commandMode==='purify'){
     if(ally.front||ally.ko||!ally.negative){
      alert('おはらいは悪いとりつきを受けた後衛に使えます');
      render(wireState);return;
     }
     commandMode=null;command({type:'purifyStart',id:clicked});
    }else alert('選択: '+ally.name);
    render(wireState);
   }else{
    const enemy=view.teams[1-activeSeat].members.find(m=>m.id===clicked);
    if(!enemy?.front||enemy.ko){alert('生存中の敵前衛を選択してね');return;}
    if(commandMode!=='target'){alert('「'+(view.activeMode==='zero'?'つつく':'ねらう')+'」を押して敵を選んでね');return;}
    commandMode=null;
    if(view.activeMode==='zero')command({type:'pokeStart',targetId:clicked});
    else command({type:'pin',targetId:clicked});
    render(wireState);
   }
   return;
  }
  if(b.dataset.rotate!==undefined){
   commandMode=null;
   command({type:'rotate',direction:Number(b.dataset.rotate)});
   render(wireState);
  }else if(b.dataset.act==='watch'){
   commandMode=null;
   command({type:'watch',mode:view.activeMode==='zero'?'standard':'zero'});
   render(wireState);
  }else if(b.dataset.act==='target'){
   commandMode=commandMode==='target'?null:'target';
   render(wireState);
  }else if(b.dataset.act==='charge'){
   commandMode=commandMode==='charge'?null:'charge';
   render(wireState);
  }else if(b.dataset.act==='purify'){
   commandMode=commandMode==='purify'?null:'purify';
   render(wireState);
  }else if(b.dataset.act==='mode-cancel'){
   commandMode=null;render(wireState);
  }else if(b.dataset.act==='pin-clear'){
   commandMode=null;command({type:'pin',targetId:null});render(wireState);
  }else if(b.dataset.act==='cancel'&&view.gesture){
   command({type:CANCEL_KIND[view.gesture.kind]});
  }else if(b.dataset.step!==undefined){
   try{
    const result=onStep(activeSeat);
    if(result?.ok===false)alert('進行不可: '+result.reason);
   }catch(error){onError(error);alert(error.message);}
  }
 }
 function resetWheelVisual(){
  const wheel=element.querySelector('#mb-team'+activeSeat+' .mb-wheel');
  if(wheel){
   wheel.classList.remove('mb-wheel-dragging');
   wheel.style.removeProperty('--wheel-drag-angle');
  }
 }
 function startWheelFinger(id,x,y,target,source){
  if(!view||view.winner!==null||view.gesture||wheelPointer)return;
  const wheel=target.closest?.('.mb-wheel');
  if(!wheel||!element.contains(wheel)||wheel.closest('[hidden]'))return;
  if(target.closest?.('.mb-center-symbol'))return;
  suppressWheelClick=false;clearTimeout(wheelClickTimer);
  const b=wheel.getBoundingClientRect(),centerX=b.left+b.width/2,centerY=b.top+b.height/2;
  const radius=Math.min(b.width,b.height)/2,d=Math.hypot(x-centerX,y-centerY);
  if(d<radius*.22||d>radius*1.12)return;
  wheelPointer={id,source,seat:activeSeat,centerX,centerY,radius,
   startAngle:wheelAngle(x,y,centerX,centerY),direction:0,dragging:false,captured:false};
 }
 function moveWheelFinger(x,y,event){
  const p=wheelPointer;if(!p||p.seat!==activeSeat)return;
  const g=wheelGestureAt({x,y,centerX:p.centerX,centerY:p.centerY,
   radius:p.radius,startAngle:p.startAngle});
  if(!g)return;
  p.direction=g.direction;
  if(Math.abs(g.delta)>Math.PI/15){
   p.dragging=true;event.preventDefault?.();
   if(p.source==='pointer'&&!p.captured){
    p.captured=true;try{element.setPointerCapture(p.id);}catch(_){}
   }
   const wheel=element.querySelector('#mb-team'+activeSeat+' .mb-wheel');
   if(wheel){
    wheel.classList.add('mb-wheel-dragging');
    wheel.style.setProperty('--wheel-drag-angle',Math.max(-60,Math.min(60,g.degrees))+'deg');
   }
  }
 }
 function onWheelDown(event){
  if(event.pointerType==='touch'||event.button!==0||event.isPrimary===false)return;
  startWheelFinger(event.pointerId,event.clientX,event.clientY,event.target,'pointer');
 }
 function onWheelMove(event){
  if(wheelPointer?.source==='pointer'&&wheelPointer.id===event.pointerId)
   moveWheelFinger(event.clientX,event.clientY,event);
 }
 function touchFor(event,id){return Array.from(event.changedTouches||[]).find(t=>t.identifier===id);}
 function onWheelTouchStart(event){
  if(event.touches?.length!==1)return;
  const t=event.changedTouches?.[0];
  if(t)startWheelFinger(t.identifier,t.clientX,t.clientY,event.target,'touch');
 }
 function onWheelTouchMove(event){
  const p=wheelPointer;if(p?.source!=='touch')return;
  const t=touchFor(event,p.id);
  if(t)moveWheelFinger(t.clientX,t.clientY,event);
 }
 function onWheelTouchEnd(event){
  const p=wheelPointer;
  if(p?.source==='touch'&&touchFor(event,p.id))finishWheel(event,false);
 }
 function onWheelTouchCancel(event){
  const p=wheelPointer;
  if(p?.source==='touch'&&touchFor(event,p.id))finishWheel(event,true);
 }
 function finishWheel(event,cancelled=false){
  const p=wheelPointer;if(!p||(p.source==='pointer'&&p.id!==event.pointerId))return;
  wheelPointer=null;resetWheelVisual();
  if(cancelled||!p.dragging||!p.direction||p.seat!==activeSeat){
   if(wireState)render(wireState);return;
  }
  event.preventDefault?.();
  suppressWheelClick=true;clearTimeout(wheelClickTimer);
  wheelClickTimer=setTimeout(()=>{suppressWheelClick=false;},460);
  commandMode=null;command({type:'rotate',direction:p.direction});
  if(wireState)render(wireState);
 }
 function onWheelUp(event){if(wheelPointer?.source==='pointer')finishWheel(event,false);}
 function onWheelCancel(event){if(wheelPointer?.source==='pointer')finishWheel(event,true);}
 function onWheelLost(event){if(wheelPointer?.source==='pointer')finishWheel(event,true);}
 function onDown(event){
  if(!view?.gesture||event.button!==0)return;
  const pad=event.target.closest('#mb-touch-pad');if(!pad)return;
  if(pointer!==null)return; // Do not let a second finger steal the active drag.
  event.preventDefault();pointer=event.pointerId;lastMove=0;
  try{pad.setPointerCapture(event.pointerId);}catch(_){}
  const kind=view.gesture.kind==='poke'?'poke':view.gesture.challenge?.kind;
  if(!['tap','pop','mash','poke'].includes(kind))sendGesture('down',coords(event,pad));
 }
 function onMove(event){
  // Capture retargets moves to the pad even when a finger leaves its bounds.
  const pad=$('mb-touch-pad');
  if(pointer!==event.pointerId||!view?.gesture)return;
  event.preventDefault();
  const kind=view.gesture.kind==='poke'?'poke':view.gesture.challenge?.kind;
  if(['tap','pop','mash','poke'].includes(kind))return;
  if(event.timeStamp-lastMove<20)return;
  lastMove=event.timeStamp;
  sendGesture('move',coords(event,pad));
 }
 function finishPointer(event,cancelled=false){
  if(pointer!==event.pointerId)return;
  event.preventDefault?.();
  const pad=$('mb-touch-pad'),kind=view?.gesture?.kind==='poke'?'poke':view?.gesture?.challenge?.kind;
  pointer=null;
  // Pointer cancellation is NOT a click. Never give out free tap progress.
  if(!view?.gesture)return;
  if(['tap','pop','mash','poke'].includes(kind)){
   if(!cancelled)sendGesture('tap',coords(event,pad));
  }else sendGesture('up');
 }
 function onUp(event){finishPointer(event,false);}
 function onCancel(event){finishPointer(event,true);}
 function onLostCapture(event){if(pointer===event.pointerId)finishPointer(event,true);}
 element.addEventListener('click',handleClick);
 document.addEventListener('visibilitychange',onSceneVisibility);
 element.addEventListener('touchstart',onWheelTouchStart,{passive:false});
 element.addEventListener('touchmove',onWheelTouchMove,{passive:false});
 element.addEventListener('touchend',onWheelTouchEnd,{passive:false});
 element.addEventListener('touchcancel',onWheelTouchCancel,{passive:false});
 element.addEventListener('pointerdown',onWheelDown);
 element.addEventListener('pointermove',onWheelMove);
 element.addEventListener('pointerup',onWheelUp);
 element.addEventListener('pointercancel',onWheelCancel);
 element.addEventListener('lostpointercapture',onWheelLost);
 element.addEventListener('pointerdown',onDown);
 element.addEventListener('pointermove',onMove);
 element.addEventListener('pointerup',onUp);
 element.addEventListener('pointercancel',onCancel);
 element.addEventListener('lostpointercapture',onLostCapture);
 function setConnection(label){$('mb-connection').textContent=String(label);}
 function destroy(){pendingCues=[];cancelScene();clearTimeout(wheelClickTimer);
  clearTimeout(purificationTimer);purificationTimer=null;
  document.removeEventListener('visibilitychange',onSceneVisibility);
  element.removeEventListener('click',handleClick);
  element.removeEventListener('touchstart',onWheelTouchStart);
  element.removeEventListener('touchmove',onWheelTouchMove);
  element.removeEventListener('touchend',onWheelTouchEnd);
  element.removeEventListener('touchcancel',onWheelTouchCancel);
  element.removeEventListener('pointerdown',onWheelDown);
  element.removeEventListener('pointermove',onWheelMove);
  element.removeEventListener('pointerup',onWheelUp);
  element.removeEventListener('pointercancel',onWheelCancel);
  element.removeEventListener('lostpointercapture',onWheelLost);
  element.removeEventListener('pointerdown',onDown);element.removeEventListener('pointermove',onMove);
  element.removeEventListener('pointerup',onUp);element.removeEventListener('pointercancel',onCancel);
  element.removeEventListener('lostpointercapture',onLostCapture);}
 return {render,setConnection,alert,destroy,selectSeat(nextSeat){
  if(fixedSeat!==null)throw new Error('network seat fixed');
  if(![0,1].includes(nextSeat))throw new RangeError('unknown seat');
  if(opponentVisibility){cancelScene();pendingCues=[];seenCueKey=null;lastEventId=0;}
  activeSeat=nextSeat;selection=null;
  clearTimeout(purificationTimer);purificationTimer=null;purificationFeedback=null;
  if(wireState)render(wireState);
 },getStatus:()=>({activeSeat,selected:selection,revision:view?.revision??-1,
  sceneEventKey:flash?.key??null,pendingVisualCues:pendingCues.length,
  ...(opponentVisibility?{opponentVisibility:opponentVisibility[activeSeat].status()}:{})})};
}
