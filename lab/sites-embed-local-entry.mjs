/**
 * Phase24-A - Sites EMBED CODE local trial.
 * Uses the REAL canonical 2-seat host battle protocol. There is NO Firebase,
 * online room, emulator config, generated Soul, hard-coded charge result or
 * privileged debug command. It is a single-device two-seat layout/pointer
 * compatibility preview, NOT online PvP and NOT a production release.
 */
import {createMatchProtocol} from '../engine/match-protocol.mjs';
import {createMatchStage} from '../ui/match-stage.mjs';

const mount=document.getElementById('yw-sites-local');
if(!mount)throw Error('Sites embed mount missing');
const $=selector=>mount.querySelector(selector);
let protocol;
let autoTimer=null;
function show(message){
 $('.yw-sites-status').textContent=String(message);
}
function runAction(seat,intent){
 const seq=protocol.snapshot().clientSequences[seat]+1;
 const result=protocol.dispatch(seat,seq,intent);
 if(result.accepted)stage.render(protocol.snapshot());
 return result;
}
function step(){
 const result=protocol.advanceAuto();
 if(result.ok)stage.render(protocol.snapshot());
 return result;
}
const stage=createMatchStage({element:$('#battle-stage'),onAction:runAction,
 onStep:step,onError:error=>show('画面エラー: '+error.message)});
stage.setConnection('LOCAL ONLY');
function reset(){
 if(autoTimer!==null){clearInterval(autoTimer);autoTimer=null;}
 $('.yw-sites-auto').textContent='自動進行 OFF';
 $('.yw-sites-auto').setAttribute('aria-pressed','false');
 protocol=createMatchProtocol({battleOptions:{seed:20261024}});
 stage.render(protocol.snapshot());
 show('ローカル試遊：A / Bを切り替えて操作できます。オンライン通信はありません。');
}
$('.yw-sites-reset').addEventListener('click',reset);
$('.yw-sites-auto').addEventListener('click',()=>{
 if(autoTimer!==null){
  clearInterval(autoTimer);autoTimer=null;
 }else{
  autoTimer=setInterval(()=>{
   if(protocol.snapshot().game.winner!==null){
    clearInterval(autoTimer);autoTimer=null;
    $('.yw-sites-auto').textContent='自動進行 OFF';
    $('.yw-sites-auto').setAttribute('aria-pressed','false');
    return;
   }
   step();
  },1500);
 }
 const active=autoTimer!==null;
 $('.yw-sites-auto').textContent=active?'自動進行 ON':'自動進行 OFF';
 $('.yw-sites-auto').setAttribute('aria-pressed',String(active));
});
reset();
