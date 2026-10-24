/**
 * Phase 14 — original responsive battle stage.
 * Pure DOM renderer shared by offline host research and Firebase SDK seats.
 * Consumes ONLY the canonical createMatchProtocol().snapshot() wire format.
 * The combat engine, turn scheduler, gesture rules and Soul are never cloned.
 * No CSS imports, network connection, timers or hidden actions.
 */
const ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,ch=>ESC[ch]);
const pct=(value,max)=>Math.max(0,Math.min(100,Math.round(100*value/(max||1))));
const LABELS={rotate:'回転',pin:'ピン',watch:'ウォッチ切替',
 chargeStart:'必殺チャージ',purifyStart:'おはらい',pokeStart:'つつく',
 chargeCancel:'必殺中止',purifyCancel:'おはらい中止',pokeCancel:'つつく中止'};
const SLOTS=[{x:17,y:32},{x:50,y:12},{x:83,y:32},
 // Keep complete lower cards inside the panel on old low-height Safari.
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
  const front=new Set(clock.frontIds);
  const members=roster.map((unit,idx)=>{
   const soul=bank.find(x=>x.id===unit.id)||{soul:0,capacity:100};
   return {id:unit.id,name:unit.name,hp:unit.hp,maxHp:unit.maxHp,
    soul:soul.soul,capacity:soul.capacity,
    front:front.has(unit.id),ko:unit.hp<=0,
    negative:(game.inspirits[unit.id]||[]).some(x=>x.sign==='negative'),
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
 const live=game.events?.slice(-5)||[];
 const roster=teams[side];
 return {revision:state.revision,turn:game.clock.turn,winner:game.winner,
  side,teams,gesture,events:live,forecast:state.forecast||[],
  activeMode:roster.mode,pin:roster.pin,clientSequences:state.clientSequences||[0,0]};
}
export function createMatchStage({element,onAction,onStep=()=>{},
 seat=null,onError=()=>{}}={}){
 if(!element||typeof element.addEventListener!=='function')throw new TypeError('root DOM element required');
 if(typeof onAction!=='function'||typeof onStep!=='function'||typeof onError!=='function')
  throw new TypeError('callbacks required');
 if(seat!==null&&seat!==0&&seat!==1)throw new RangeError('seat must be null, 0 or 1');
 const fixedSeat=seat;
 let activeSeat=seat??0,wireState=null,view=null,selection=null;
 let recentMessage='準備中',pointer=null,lastMove=0;
 let seenActionTurn=null,flash=null,flashTimer=null;
 element.innerHTML=`
 <div class="mb-stage">
  <header class="mb-topbar">
   <div class="mb-title-group"><span class="mb-mark">◈</span><div>
    <small>ORIGINAL CIRCLE BATTLE / RESEARCH</small>
    <h1>輪戦 <span>—</span> サークルバトル</h1></div></div>
   <div class="mb-state"><span id="mb-connection" class="mb-online">LOCAL</span><span>TURN <b id="mb-turn">0</b></span></div>
  </header>
  <div class="mb-disclaimer">原作の駆け引きを研究したオリジナル対戦。技の一部数値・入力条件は仮モデル。閃光魂は初期版OFF。</div>
  <section class="mb-forecast-section"><div class="mb-section-label">
   <b>次の5行動</b><span>予測・回転／KOで変化します</span></div>
   <div class="mb-forecast" id="mb-forecast"></div>
   <div class="mb-action-label" id="mb-action-label" aria-live="polite">次の行動を待機中</div>
  </section>
  <section class="mb-arena" aria-label="対戦フィールド">
   <div id="mb-team0" class="mb-team mb-side0"></div>
   <div class="mb-divider"><div>VS</div></div>
   <div id="mb-team1" class="mb-team mb-side1"></div>
  </section>
  <div class="mb-bottom">
   <section class="mb-actions">
    <div class="mb-command-head"><div>
     <b id="mb-active-label">PLAYER A の操作</b><small id="mb-selected">妖怪を選択してください</small>
    </div><div class="mb-seat-switch" id="mb-seat-switch">
     <button type="button" data-seat="0" class="is-active">A</button>
     <button type="button" data-seat="1">B</button></div></div>
    <div class="mb-control-grid">
     <button type="button" data-rotate="-1" class="mb-big">↶ 左回転</button>
     <button type="button" data-rotate="1" class="mb-big">右回転 ↷</button>
     <button type="button" data-act="watch" id="mb-watch">零式へ切替</button>
     <button type="button" data-act="pin-clear">ピン解除</button>
     <button type="button" data-act="charge" class="mb-accent">✦ 必殺技</button>
     <button type="button" data-act="purify">おはらい</button>
    </div>
    <div class="mb-footnote" id="mb-mode-hint">敵の前衛をタップしてピンを付けられます</div>
   </section>
   <section class="mb-feed"><div class="mb-command-head"><b>戦況</b><button type="button" id="mb-step" data-step="1">次の行動 ▶</button></div>
    <div class="mb-activity" id="mb-activity" aria-live="polite">読み込み中</div>
    <div class="mb-feed-list" id="mb-feed-list"></div>
    <small class="mb-revision" id="mb-revision">REV 0</small>
   </section>
  </div>
  <div class="mb-modal" id="mb-modal" hidden>
   <div class="mb-modal-surface" role="dialog" aria-modal="true" aria-label="タッチ操作">
    <div class="mb-command-head"><b id="mb-gesture-title">操作</b><button type="button" data-act="cancel">中止 ✕</button></div>
    <p id="mb-gesture-help">指で操作</p>
    <div class="mb-touch-pad" id="mb-touch-pad"><div id="mb-touch-points"></div></div>
    <div class="mb-meter"><i id="mb-gesture-bar"></i></div>
    <small id="mb-gesture-progress"></small>
   </div>
  </div>
 </div>`;
 const $=id=>element.querySelector('#'+id);
 function alert(text){recentMessage=String(text);$('mb-activity').textContent=recentMessage;}
 function command(intent){
  if(!wireState){alert('戦闘がまだ始まっていません');return;}
  if(view.winner!==null){alert('試合が終了しています');return;}
  try{
   const value=onAction(activeSeat,intent);
   if(value&&typeof value.then==='function'){
    value.then(report).catch(err=>{onError(err);alert(err.message);});
   }else report(value);
  }catch(err){onError(err);alert(err.message);}
 }
 function report(result){
  if(result?.ok===false){
   const reason=result.result?.reason||result.reason||'rule_rejected';
   alert('操作できません: '+reason);return;
  }
  if(result?.queued)alert('入力を順番待ちに追加（残り '+result.position+' 件）');
  else if(result?.accepted===true)alert('操作を確定 / rev '+result.revision);
  else if(result?.clientSeq)alert('入力 '+result.clientSeq+' を送信 / ACK待ち');
 }
 function teamHTML(t){
  const chunks=t.members.map(unit=>{
   const pos=SLOTS[unit.slot];
   const selected=selection===unit.id&&t.side===activeSeat?' mb-selected':'';
   const pinned=t.side!==activeSeat&&unit.id===view.teams[activeSeat].pin?' mb-pinned':'';
   const disabled=unit.ko?' mb-ko':'';
   const animated=flash?.actor===unit.id?' mb-acting':flash?.target===unit.id
    ?(flash.kind==='heal'?' mb-healed':' mb-hit'):'';
   const benched=unit.front?'':' mb-bench';
   const name=escapeHTML(unit.name);
   const figure=Number(unit.id.slice(1));
   return '<button type="button" data-unit="'+unit.id+'" class="mb-creature'+selected+pinned+disabled+animated+benched+
    '" style="--x:'+pos.x+'%;--y:'+pos.y+'%" aria-label="'+name+(unit.front?' 前衛':' 後衛')+'">'+
    '<span class="mb-avatar mb-avatar-'+figure+'"><i class="mb-eyes"></i></span>'+
    '<span class="mb-name">'+name+'</span>'+
    '<span class="mb-bars"><i style="width:'+pct(unit.hp,unit.maxHp)+'%"></i></span>'+
    '<span class="mb-bars mb-soulbar"><i style="width:'+pct(unit.soul,unit.capacity)+'%"></i></span>'+
    '<span class="mb-unit-stat">'+unit.hp+'/'+unit.maxHp+(unit.negative?' ⚠':'')+'</span>'+
    (unit.front?'<span class="mb-front-badge">前衛</span>':'')+
    (flash?.target===unit.id&&Number.isFinite(flash.amount)&&flash.amount>0
     ?'<span class="mb-floating-number">'+(flash.kind==='heal'?'+':'−')+flash.amount+'</span>':'')+
    '</button>';
  }).join('');
  return '<div class="mb-team-heading"><span class="mb-team-icon">'+(t.side===0?'A':'B')+'</span>'+
   '<div><b>PLAYER '+(t.side===0?'A':'B')+'</b><small>妖怪6体 / '+(t.mode==='zero'?'零式':'標準')+'ウォッチ</small></div>'+
   '<span class="mb-team-control-indicator">'+(activeSeat===t.side?'操作中':'')+'</span></div>'+
   '<div class="mb-wheel"><div class="mb-wheel-ring"></div><div class="mb-center-symbol">輪</div>'+chunks+'</div>';
 }
 function forecastHTML(){
  if(!view.forecast.length)return '<div class="mb-empty">次の行動を予測できません</div>';
  return view.forecast.slice(0,5).map((action,index)=>{
   const char=view.teams[action.id?.startsWith('A')?0:1].members.find(x=>x.id===action.id);
   return '<div class="mb-next"><span class="mb-num">'+String(index+1).padStart(2,'0')+'</span>'+
    '<span class="mb-next-avatar '+(action.id?.startsWith('A')?'mb-a':'mb-b')+'">'+escapeHTML(action.id?.slice(0,1)||'?')+'</span>'+
    '<div><strong>'+escapeHTML(char?.name||action.id)+'</strong><small>予測順 '+(index+1)+'</small></div></div>';
  }).join('');
 }
 function feedHTML(){
  const logs=view.events.slice(-4).reverse();
  if(!logs.length)return '<div class="mb-feed-empty">次の行動を押すと戦闘が進みます</div>';
  return logs.map(x=>{
   const person=x.actor||x.id||x.targetId||'';
   const type=x.kind||x.type||'行動';
   const number=Number.isFinite(x.amount)?' / '+x.amount:'';
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
  wireState=state;
  view=makeStageView(state,activeSeat);
  const action=view.events.slice().reverse().find(e=>e.type==='action')??null;
  if(seenActionTurn===null)seenActionTurn=action?.turn??0;
  else if(action&&action.turn>seenActionTurn){
   seenActionTurn=action.turn;
   flash={actor:action.actor,target:action.target,amount:action.amount,kind:action.kind};
   clearTimeout(flashTimer);
   flashTimer=setTimeout(()=>{
    flash=null;
    element.querySelectorAll('.mb-acting,.mb-hit,.mb-healed').forEach(el=>{
     el.classList.remove('mb-acting','mb-hit','mb-healed');
    });
    element.querySelectorAll('.mb-floating-number').forEach(el=>el.remove());
   },780);
  }
  const own=view.teams[activeSeat];
  if(!own.members.some(x=>x.id===selection))selection=own.frontIds[0];
  $('mb-turn').textContent=String(view.turn);
  $('mb-team0').innerHTML=teamHTML(view.teams[0]);
  $('mb-team1').innerHTML=teamHTML(view.teams[1]);
  $('mb-forecast').innerHTML=forecastHTML();
  if(action){
   const actor=view.teams[action.actor?.startsWith('B')?1:0]?.members.find(u=>u.id===action.actor);
   const target=view.teams[action.target?.startsWith('B')?1:0]?.members.find(u=>u.id===action.target);
   const kindNames={attack:'攻撃',technique:'妖術',inspirit:'とりつき',guard:'ガード',heal:'回復',loaf:'サボり'};
   $('mb-action-label').textContent=(actor?.name||action.actor||'妖怪')+' → '+(target?.name||'行動')+
    ' / '+(kindNames[action.kind]||action.kind)+(action.hit===false?'（ミス）':
    action.amount>0?' '+action.amount:'');
  }else $('mb-action-label').textContent='次の行動を待機中';
  $('mb-active-label').textContent='PLAYER '+(activeSeat?'B':'A')+' の操作';
  const selected=own.members.find(x=>x.id===selection);
  $('mb-selected').textContent=selected?'選択: '+selected.name+(selected.front?' / 前衛':' / 後衛'):'妖怪を選択';
  $('mb-watch').textContent=own.mode==='zero'?'標準ウォッチへ':'零式ウォッチへ';
  $('mb-mode-hint').textContent=own.mode==='zero'
   ?'零式：敵を選んで「つつく」（条件に合う時のみ）':
    '標準：敵の前衛を選んでピンで狙おう';
  $('mb-activity').textContent=recentMessage;
  $('mb-feed-list').innerHTML=feedHTML();
  $('mb-revision').textContent='REV '+view.revision+' / A '+view.clientSequences[0]+' ・ B '+view.clientSequences[1];
  $('mb-seat-switch').hidden=fixedSeat!==null;
  element.querySelectorAll('[data-seat]').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.seat)===activeSeat));
  $('mb-step').disabled=(fixedSeat!==null&&activeSeat!==0)||view.winner!==null;
  modal();
  if(view.winner!==null)alert('対戦終了：PLAYER '+(view.winner===0?'A':'B')+' の勝ち');
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
  const b=event.target.closest('button');if(!b||!element.contains(b)||!view)return;
  const oldSide=activeSeat;
  if(b.dataset.seat!==undefined){
   if(fixedSeat!==null)return;
   activeSeat=Number(b.dataset.seat);selection=null;render(wireState);return;
  }
  if(b.dataset.unit){
   const clicked=b.dataset.unit;
   if(clicked.startsWith(activeSeat===0?'A':'B')){
    selection=clicked;render(wireState);alert('選択: '+view.teams[activeSeat].members.find(m=>m.id===clicked)?.name);
   }else{
    const enemy=view.teams[1-activeSeat].members.find(m=>m.id===clicked);
    if(!enemy?.front||enemy.ko){alert('相手前衛の生存妖怪を選んでね');return;}
    if(view.activeMode==='zero')command({type:'pokeStart',targetId:clicked});
    else command({type:'pin',targetId:clicked});
   }
   return;
  }
  if(b.dataset.rotate!==undefined)command({type:'rotate',direction:Number(b.dataset.rotate)});
  else if(b.dataset.act==='watch')command({type:'watch',mode:view.activeMode==='zero'?'standard':'zero'});
  else if(b.dataset.act==='pin-clear')command({type:'pin',targetId:null});
  else if(b.dataset.act==='charge')command({type:'chargeStart',id:selection||view.teams[activeSeat].frontIds[0]});
  else if(b.dataset.act==='purify')command({type:'purifyStart',id:selection||view.teams[activeSeat].benchIds[0]});
  else if(b.dataset.act==='cancel'&&view.gesture)command({type:CANCEL_KIND[view.gesture.kind]});
  else if(b.dataset.step!==undefined){
   try{
    const result=onStep(activeSeat);
    if(result?.ok===false)alert('進行不可: '+result.reason);
   }catch(error){onError(error);alert(error.message);}
  }
  if(activeSeat!==oldSide&&wireState)render(wireState);
 }
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
 element.addEventListener('pointerdown',onDown);
 element.addEventListener('pointermove',onMove);
 element.addEventListener('pointerup',onUp);
 element.addEventListener('pointercancel',onCancel);
 element.addEventListener('lostpointercapture',onLostCapture);
 function setConnection(label){$('mb-connection').textContent=String(label);}
 function destroy(){clearTimeout(flashTimer);element.removeEventListener('click',handleClick);
  element.removeEventListener('pointerdown',onDown);element.removeEventListener('pointermove',onMove);
  element.removeEventListener('pointerup',onUp);element.removeEventListener('pointercancel',onCancel);
  element.removeEventListener('lostpointercapture',onLostCapture);}
 return {render,setConnection,alert,destroy,selectSeat(nextSeat){
  if(fixedSeat!==null)throw new Error('network seat fixed');
  if(![0,1].includes(nextSeat))throw new RangeError('unknown seat');
  activeSeat=nextSeat;selection=null;if(wireState)render(wireState);
 },getStatus:()=>({activeSeat,selected:selection,revision:view?.revision??-1})};
}
