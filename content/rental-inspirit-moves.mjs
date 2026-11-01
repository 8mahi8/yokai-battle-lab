/**
 * Phase 1.7 original-rental Inspirit authoring source.
 * These are original CHARACTER fixtures, not exact original YW2 move values.
 * A move identifies its status and level; actual RNG/turn duration is owned
 * by the battle engine and independently researched.
 */
import {inspiritEffectById} from './inspirit-effect-master.mjs';
const ids=['sleep','strength-up','strength-up',
 'sleep','strength-up','sleep'];
export const RENTAL_INSPIRIT_MOVES=Object.freeze(ids.map((effect,index)=>{
 const entry=inspiritEffectById(effect);
 if(!entry)throw new TypeError('unknown authored Inspirit effect: '+effect);
 return Object.freeze({
  id:'rental-'+String(index+1).padStart(2,'0')+':inspirit',
  slot:'inspirit',effect,sign:entry.sign,
  targetScope:entry.sign==='negative'?'single_enemy':'single_ally',
  level:1,duration:null,evidence:'fixture'
 });
}));
