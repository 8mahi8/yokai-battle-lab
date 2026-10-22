/** Pure Phase 3 status ledger. The non-turn duration rule on Mt. Wildwood applies to YKW1/YKW2.
 * Magnitudes, chances and stacking remain unverified in this research prototype.
 */
export function createInspiritLedger(validIds) {
  const ids=new Set(validIds);
  if(!ids.size||[...ids].some(id=>typeof id!=='string'||!id))throw new TypeError('validIds required');
  const entries=new Map([...ids].map(id=>[id,[]]));
  let nextSerial=1;
  function checkId(id){if(!ids.has(id))throw new RangeError('unknown member');}
  function clone(s){return {...s};}
  function list(id){checkId(id);return entries.get(id).map(clone);}
  function apply({id,sign,effect,source=null,duration=null}={}){
    checkId(id);
    if(!['positive','negative'].includes(sign))throw new RangeError('positive or negative sign required');
    if(typeof effect!=='string'||!effect||effect.length>64)throw new TypeError('effect label required');
    if(source!==null&&(typeof source!=='string'||source.length>64))throw new TypeError('invalid source');
    if(duration!==null&&(!Number.isInteger(duration)||duration<1||duration>10000))throw new RangeError('invalid owner-turn duration');
    const item={serial:nextSerial++,sign,effect,source,
      mode:duration!==null?'ownerTurns':sign==='positive'?'globalActions':'persistent',
      remaining:duration!==null?duration:sign==='positive'?30:null};
    entries.get(id).push(item);
    return clone(item);
  }
  function tick({actorId}={}){
    checkId(actorId);
    const expired=[];
    for(const [id,items] of entries){
      for(let i=items.length-1;i>=0;i--){
        const item=items[i];
        if(item.mode==='globalActions'||(item.mode==='ownerTurns'&&id===actorId)){
          item.remaining--;
          if(item.remaining===0){expired.push({id,...clone(item)});items.splice(i,1);}
        }
      }
    }
    return expired;
  }
  function purify({id,side,benchIds}={}){
    checkId(id);
    if(![0,1].includes(side))throw new RangeError('invalid side');
    if(id[0] !== (side===0?'A':'B'))throw new RangeError('not your team member');
    if(!Array.isArray(benchIds)||!benchIds.includes(id))return {ok:false,reason:'must_be_on_bench',removed:[]};
    const all=entries.get(id),removed=all.filter(x=>x.sign==='negative').map(clone);
    if(!removed.length)return {ok:false,reason:'no_negative_inspirit',removed:[]};
    entries.set(id,all.filter(x=>x.sign!=='negative'));
    return {ok:true,removed};
  }
  function has(id,effect){checkId(id);return entries.get(id).some(x=>x.effect===effect);}
  return {list,apply,tick,purify,has};
}
