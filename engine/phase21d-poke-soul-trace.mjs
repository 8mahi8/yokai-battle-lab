/**
 * Phase21D-C2: observation-only YW2 Zero Watch Poke Soul-gauge trace.
 *
 * Nintendo's Yo-kai Watch 2 instruction manual, battle / "Model Zero
 * Command: Poke", explicitly lists draining an ENEMY's Soul Meter as
 * one possible reward; it does not specify drain amount, transfer
 * recipient, outcome probabilities or whether every Poke drains Soul.
 * https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-Yo-Kai_Watch_2_Fleshy_Souls
 *
 * The compared readings must be taken before/after a completed Poke.
 * An observed gauge change is NOT proof of its exact underlying cause.
 * No hooks into default PvP host, RNG, production Firebase or UI.
 */
const ID=/^[AB][1-6]$/;
const IDS=Object.freeze([
  ...Array.from({length:6},(_,i)=>'A'+(i+1)),
  ...Array.from({length:6},(_,i)=>'B'+(i+1))
]);
function validateSnapshot(records,label){
  if(!Array.isArray(records)||records.length!==12)
    throw new TypeError(label+' must have all 12 Yo-kai');
  const members=new Map();
  for(const row of records){
    if(!row||typeof row!=='object'||Array.isArray(row)||!ID.test(row.id)||
       members.has(row.id)||
       !Number.isSafeInteger(row.capacity)||row.capacity<=0||
       !Number.isSafeInteger(row.soul)||row.soul<0||row.soul>row.capacity)
      throw new TypeError(label+' contains a missing, duplicated or invalid gauge');
    members.set(row.id,{id:row.id,capacity:row.capacity,soul:row.soul});
  }
  if(IDS.some(id=>!members.has(id)))
    throw new TypeError(label+' must include exactly A1–A6 and B1–B6');
  return members;
}

/**
 * @param {{
 *  side:0|1,targetId:string,
 *  before:Array<{id:string,soul:number,capacity:number}>,
 *  after:Array<{id:string,soul:number,capacity:number}>,
 *  isolatedPokeWindow?:boolean
 * }} data
 * @returns {object} factual meter deltas and indeterminate original causes
 */
export function auditPokeSoulTrace({
  side,targetId,before,after,isolatedPokeWindow=false
}={}){
  if(side!==0&&side!==1)throw new RangeError('side must be 0 or 1');
  const foePrefix=side===0?'B':'A',ownPrefix=side===0?'A':'B';
  if(typeof targetId!=='string'||!ID.test(targetId)||
     !targetId.startsWith(foePrefix))
    throw new TypeError('target must be the other side\'s A1–A6/B1–B6 member');
  if(typeof isolatedPokeWindow!=='boolean')
    throw new TypeError('isolatedPokeWindow must be boolean');
  const prior=validateSnapshot(before,'before');
  const next=validateSnapshot(after,'after');
  const changes=IDS.map(id=>{
    const p=prior.get(id),n=next.get(id);
    if(p.capacity!==n.capacity)
      throw new RangeError('changing gauge capacity invalidates observation: '+id);
    return {id,side:id.startsWith('A')?0:1,
      before:p.soul,after:n.soul,delta:n.soul-p.soul};
  });
  const foeChanges=changes.filter(x=>x.id.startsWith(foePrefix)&&x.delta!==0);
  const allyChanges=changes.filter(x=>x.id.startsWith(ownPrefix)&&x.delta!==0);
  const targetChange=changes.find(x=>x.id===targetId);
  const potentialRecipients=allyChanges.filter(x=>x.delta>0).map(x=>x.id);
  const limitations=[
    'Official documentation lists enemy Soul draining as ONE possible Poke result, not a guaranteed outcome.',
    'No sourced Poke Soul amount, recipient selection, probability or original event timing is established.',
    'A recorded Soul delta alone does not prove Poke caused it or that the entire lost amount was transferred.'
  ];
  if(!isolatedPokeWindow)
    limitations.push('Intervening actions, passive recovery and equipment effects have not been excluded.');
  return {
    model:'read-only-12-gauge-poke-observation',
    evidenceTier:'official-effect-type-numeric-details-unverified',
    side,targetId,changes,foeChanges,allyChanges,
    targetLost:Math.max(0,-targetChange.delta),
    potentialRecipients,
    status:!isolatedPokeWindow?'indeterminate':
      targetChange.delta<0?'target-soul-decrease-observed':'no-target-soul-decrease-observed',
    limitations
  };
}
