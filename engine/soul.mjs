/**
 * Phase 4 research: soul meter / Watch mode / Soultimate and G-tech eligibility.
 * Source for mode and ring adjacency: https://gamepedia.jp/youkai-yw2/archives/1873
 * Soul accrual rate, minigame timing, extra effect rules deliberately NOT modeled.
 */
/** Published YW1/YW2/YW3 baseline interruption formula; no per-move bonuses yet.
 * https://mtwildwood.net/soultimate-charge.php
 */
export function chargeInterruptChance({damage,maxHp,hitsTaken=0,critical=false,moveBonus=0,immune=false}={}){
 if(!Number.isFinite(damage)||damage<0||!Number.isFinite(maxHp)||maxHp<=0||
    !Number.isInteger(hitsTaken)||hitsTaken<0||!Number.isFinite(moveBonus)||
    typeof critical!=='boolean'||typeof immune!=='boolean')
    throw new RangeError('invalid charge interruption parameters');
 if(immune)return 0;
 const base=[8,12,18,35][Math.min(hitsTaken,3)];
 return Math.max(0,Math.min(100,base+10*damage/maxHp+moveBonus+(critical?10:0)));
}

/** YW1–3 documented Rank 1–4 Soultimate Soul costs.
 * https://www.mtwildwood.net/soultimates.php (Charge / Soul points needed)
 * These are Soultimate move ranks, not Yo-kai character ranks.
 */
export const SOULTIMATE_CHARGE_BY_RANK = Object.freeze({1:100,2:150,3:200,4:250});
export function soulCapacityForRank(rank){
 if(!Number.isInteger(rank)||rank<1||rank>4)throw new RangeError('Soultimate rank 1..4 required');
 return SOULTIMATE_CHARGE_BY_RANK[rank];
}

export function createSoulSystem({teams} = {}) {
  if (!Array.isArray(teams) || teams.length !== 2 ||
      teams.some(team => !Array.isArray(team) || team.length !== 6)) {
    throw new TypeError('exactly two ordered teams with six units each required');
  }
  const units = new Map();
  const rings = teams.map((team, side) => team.map((entry, position) => {
    if (!entry || typeof entry.id !== 'string' || !entry.id || units.has(entry.id)) {
      throw new TypeError('all member ids must be distinct, nonempty strings');
    }
    const capacity = entry.capacity ?? (entry.soultimateRank === undefined?100:soulCapacityForRank(entry.soultimateRank));
    // Capacity=100 without a provided rank remains the original rental-fixture default.
    const soul = entry.soul ?? 0;
    if (!Number.isInteger(capacity) || capacity <= 0 || !Number.isInteger(soul) || soul < 0 || soul > capacity) {
      throw new RangeError('soul/capacity must be valid integers');
    }
    units.set(entry.id, {id:entry.id,side,position,capacity,soul});
    return entry.id;
  }));
  const modes = ['standard','standard'];
  const pending = [null,null];
  let serial = 0;
  function checkSide(side) {
    if (side !== 0 && side !== 1) throw new RangeError('invalid side');
  }
  function unit(id) {
    const found = units.get(id);
    if (!found) throw new RangeError('unknown member');
    return found;
  }
  function checkFront(side,frontIds) {
    checkSide(side);
    if (!Array.isArray(frontIds) || frontIds.length !== 3 || new Set(frontIds).size !== 3 ||
      frontIds.some(id => !rings[side].includes(id))) throw new TypeError('three distinct own front members required');
    const indices = frontIds.map(id => rings[side].indexOf(id)).sort((a,b)=>a-b);
    if (![0,1,2,3,4,5].some(i=>[i,(i+1)%6,(i+2)%6].every(x=>indices.includes(x)))) {
      throw new RangeError('front members must be contiguous on fixed ring');
    }
  }
  function setMode(side,mode) {
    checkSide(side);
    if (mode !== 'standard' && mode !== 'zero') throw new RangeError('invalid Watch mode');
    modes[side] = mode;
    pending[side] = null;
    return mode;
  }
  function addSoul(id,amount) {
    if (!Number.isInteger(amount) || amount < 0) throw new RangeError('nonnegative integer soul increment required');
    const found=unit(id);
    found.soul=Math.min(found.capacity,found.soul+amount);
    return found.soul;
  }
  function setSoul(id,amount) {
    const found=unit(id);
    if (!Number.isInteger(amount) || amount < 0 || amount > found.capacity) throw new RangeError('invalid soul amount');
    found.soul=amount;
    return amount;
  }
  /**
   * Atomic host-only Poke Soul transfer. Both members and the amount are
   * validated before modifying either meter. The target and beneficiary
   * must be on opposite sides; eligibility/aliveness and reward RNG remain
   * the combat host's responsibility.
   *
   * No YW2 transfer quantity or recipient policy is asserted here.
   */
  function transferSoul({sourceId,recipientId,maxAmount}={}) {
    if(!Number.isSafeInteger(maxAmount)||maxAmount<0)
      throw new RangeError('transfer maxAmount must be a nonnegative safe integer');
    const source=unit(sourceId),recipient=unit(recipientId);
    if(source.side===recipient.side)
      throw new RangeError('Soul transfer must cross opposing teams');
    const amount=Math.min(maxAmount,source.soul,
      recipient.capacity-recipient.soul);
    // All checks completed; no partial meter write on invalid requests.
    source.soul-=amount;
    recipient.soul+=amount;
    return amount;
  }
  function neighbors(side,id) {
    checkSide(side);
    const caster=unit(id);
    if(caster.side!==side)throw new RangeError('not your member');
    const p=caster.position;
    return [rings[side][(p+5)%6],id,rings[side][(p+1)%6]];
  }
  function eligibility({side,casterId,frontIds,alive=true}={}) {
    checkFront(side,frontIds);
    const caster=unit(casterId);
    if (caster.side!==side)throw new RangeError('not your member');
    const isG=modes[side]==='zero';
    const consumers=isG?neighbors(side,casterId):[casterId];
    if (!frontIds.includes(casterId))return {ok:false,reason:'caster_not_front',mode:modes[side],consumers};
    if (!alive)return {ok:false,reason:'caster_ko',mode:modes[side],consumers};
    const missing=consumers.filter(id=>unit(id).soul<unit(id).capacity);
    return missing.length
      ? {ok:false,reason:'soul_not_full',mode:modes[side],consumers,missing}
      : {ok:true,mode:modes[side],consumers,powerMultiplier:isG?2:1};
  }
  function prepare({side,casterId,frontIds,alive=true}={}) {
    const result=eligibility({side,casterId,frontIds,alive});
    if (!result.ok)return result;
    if (pending[side])return {ok:false,reason:'charge_already_pending'};
    const token=++serial;
    pending[side]={token,casterId,mode:modes[side],consumers:[...result.consumers]};
    return {ok:true,token,...result};
  }
  function resolve({side,token,frontIds,success,alive=true}={}) {
    checkSide(side);
    if (!Number.isInteger(token) || typeof success!=='boolean') throw new TypeError('token and success are required');
    const charge=pending[side];
    if(!charge || charge.token!==token)return {ok:false,reason:'stale_or_unknown_charge'};
    pending[side]=null;
    if(!success)return {ok:false,reason:'charge_cancelled'};
    const status=eligibility({side,casterId:charge.casterId,frontIds,alive});
    if(!status.ok)return status;
    if(status.mode!==charge.mode || status.consumers.join('|')!==charge.consumers.join('|'))
      return {ok:false,reason:'charge_changed'};
    for(const id of status.consumers)unit(id).soul=0;
    return {ok:true,kind:status.mode==='zero'?'g-tech':'soultimate',casterId:charge.casterId,
      consumers:[...status.consumers],powerMultiplier:status.powerMultiplier};
  }
  function pokeEligibility({side,targetId,enemyFrontIds,negativeIds=[],loafingIds=[]}={}) {
    checkSide(side);
    if(modes[side]!=='zero')return {ok:false,reason:'zero_mode_required'};
    checkFront(1-side,enemyFrontIds);
    if(!enemyFrontIds.includes(targetId))return {ok:false,reason:'enemy_not_front'};
    if(!negativeIds.includes(targetId) && !loafingIds.includes(targetId))return {ok:false,reason:'target_not_vulnerable'};
    return {ok:true,targetId,reward:'unresolved'};
  }
  function snapshot() {
    return {modes:[...modes],teams:rings.map(r=>r.map(id=>({...unit(id)}))),
      pending:pending.map(p=>p?{...p,consumers:[...p.consumers]}:null)};
  }
  return {snapshot,setMode,addSoul,setSoul,transferSoul,neighbors,eligibility,prepare,resolve,pokeEligibility};
}
