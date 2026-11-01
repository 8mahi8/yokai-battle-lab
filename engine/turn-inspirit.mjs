/**
 * Turn-end HP Inspirit effects — opt-in battle RESEARCH.
 *
 * YW2 field descriptions support gradual HP loss/gain as distinct Inspirits,
 * after the affected Yo-kai's OWN turn, and 30-global-action durations for
 * most positive Inspirits. The Peppillon/Lava Lord YW2 move description gives
 * 5% of max HP per regeneration level (up to 5 levels).
 *
 * Applying that same 5%-per-level scale to negative HP-loss, netting effects
 * and the rounding/KO priority are INVESTIGATIVE FIXTURES, not proven
 * original YW2 mechanics.
 *
 * Sources: https://mtwildwood.net/inspirits.php?g=yw2
 * https://mtwildwood.net/ja/yw2/yokai/peppillon
 * https://mtwildwood.net/yw2/moves
 */
export function calculateTurnInspirit({statuses,currentHp,maxHp}={}){
 if(!Array.isArray(statuses))throw new TypeError('statuses array required');
 if(!Number.isSafeInteger(maxHp)||maxHp<=0||
   !Number.isSafeInteger(currentHp)||currentHp<0||currentHp>maxHp)
   throw new RangeError('invalid current/max HP');
 let loss=0,regen=0;
 for(const s of statuses){
  const type=s?.effect;
  if(type!=='hp-loss'&&type!=='hp-regen')continue;
  if((type==='hp-loss'&&s.sign!=='negative')||
     (type==='hp-regen'&&s.sign!=='positive'))
   throw new RangeError('HP Inspirit effect sign mismatch');
  const level=s.level??1;
  if(!Number.isInteger(level)||level<1||level>4)
   throw new RangeError('HP Inspirit level must be 1..4');
  if(type==='hp-loss')loss+=level;
  else regen+=level;
 }
 const signed=Math.max(-5,Math.min(5,regen-loss));
 const proposed=Math.floor(maxHp*Math.abs(signed)*.05);
 const next=Math.max(0,Math.min(maxHp,currentHp+(signed<0?-proposed:proposed)));
 const delta=next-currentHp;
 return {kind:delta<0?'loss':delta>0?'regen':'none',
  amount:Math.abs(delta),hpAfter:next,
  lossLevel:Math.min(5,loss),regenLevel:Math.min(5,regen),
  netLevel:signed,percentage:signed*.05,
  model:'yw2-own-turn-hp-research-fixture'};
}
