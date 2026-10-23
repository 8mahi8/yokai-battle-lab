/**
 * Healing-technique RESEARCH fixture for original-rental six-unit matches.
 *
 * Original Yo-kai Watch 2 has level-1 healing technique powers 20, 50, 80
 * (Heal, Restore, Paradise) and spirit-based healing. Sep-2026 paired-3DS
 * observations place healing amounts within approximately -10%..+10% plus
 * small rounding variation. The BASE HEALING EQUATION is not established by
 * our sources: (power+spirit)/3 remains an explicitly provisional fixture.
 *
 * Sources:
 * https://gamepedia.jp/youkai-yw2/magics/3171
 * https://note.com/atoato429429429/n/nfefe8749d432
 */
import {statStageMultiplier} from './damage-model.mjs';
export function calculateHeal({
 power,spirit,spiritStage=0,targetHp,maxHp,
 varianceRoll=null,baseScale=1/3
}={}){
 for(const [name,n] of Object.entries({power,spirit,targetHp,maxHp,baseScale})){
  if(!Number.isFinite(n)||n<0)throw new RangeError('invalid '+name);
 }
 if(!Number.isSafeInteger(targetHp)||!Number.isSafeInteger(maxHp)||
    maxHp<1||targetHp>maxHp)
  throw new RangeError('invalid target HP');
 if(baseScale<=0||baseScale>2)throw new RangeError('invalid base healing scale');
 const effectiveSpirit=spirit*statStageMultiplier(spiritStage);
 const provisionalBase=Math.max(1,Math.floor((power+effectiveSpirit)*baseScale));
 if(varianceRoll!==null&&(!Number.isFinite(varianceRoll)||
     varianceRoll<0||varianceRoll>=1))
  throw new RangeError('varianceRoll must be [0,1)');
 // Fixed deterministic simulated ±10% + one HP rounding window.
 const varianceAmount=varianceRoll===null?0:
   Math.floor(varianceRoll*(2*Math.floor(provisionalBase/10+1)+1))-
     Math.floor(provisionalBase/10+1);
 const rolled=Math.max(1,provisionalBase+varianceAmount);
 const amount=Math.min(maxHp-targetHp,rolled);
 return {
  amount,hpAfter:targetHp+amount,rolled,base:provisionalBase,
  varianceAmount,spiritStage,spiritMultiplier:statStageMultiplier(spiritStage),
  model:'unverified-base-healing-fixture',varianceSource:'paired-3ds-2026-observations'
 };
}
