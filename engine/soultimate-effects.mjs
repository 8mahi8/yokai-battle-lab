/**
 * Opt-in research rules for original rental Soultimate effects.
 *
 * Reference for the four Soul costs and structural move varieties:
 *   https://mtwildwood.net/soultimates.php?g=yw2
 * Independent YW2 experiment: +5 Soul at the end of the actor's turn
 *   when the actor has not attacked (not tested for every move):
 *   https://note.com/ricosama0726/n/n14710bbe446c
 *
 * Fixture attack/heal magnitudes are fictional, NOT game-accurate data.
 */
/** Exactly one actor, after their own non-offensive action; opt-in. */
export function observedNonAttackRecovery(kind,{amount=5}={}){
 if(!Number.isInteger(amount)||amount<0||amount>100)throw new RangeError('invalid research Soul recovery');
 if(!['attack','technique','heal','guard','inspirit','loaf'].includes(kind))throw new RangeError('unknown move');
 return ['heal','guard','inspirit','loaf'].includes(kind)?amount:0;
}

/** Normalizes original fictional special moves, never imports original character move assets. */
export function normalizeRentalSpecial(spec){
 if(spec===undefined||spec===null)return {kind:'attack',targets:'all',method:'physical',power:65};
 if(typeof spec!=='object'||Array.isArray(spec))throw new TypeError('special must be an object');
 const {kind,targets,method,power}=spec;
 if(!['attack','heal'].includes(kind))throw new RangeError('special kind must be attack/heal');
 if(!['one','all'].includes(targets))throw new RangeError('special targets must be one/all');
 if(kind==='attack'&&!['physical','technique'].includes(method))throw new RangeError('unknown attack method');
 if(kind==='heal'&&method!==undefined&&method!=='healing')throw new RangeError('heal method must be healing');
 if(!Number.isInteger(power)||power<1||power>999)throw new RangeError('special power must be 1..999');
 return {kind,targets,method:kind==='heal'?'healing':method,power};
}

/** Single-hit damage uses the regular YW2-like attack model; exception rules are not yet modeled. */
export function soultimateBaseHit({power,strength=0,spirit=0,defense=0,method,multiplier=1}={}){
 if(!Number.isFinite(power)||power<1||!Number.isFinite(strength)||strength<0||
   !Number.isFinite(spirit)||spirit<0||!Number.isFinite(defense)||defense<0||
   !Number.isFinite(multiplier)||multiplier<=0)throw new RangeError('invalid special hit values');
 if(!['physical','technique'].includes(method))throw new RangeError('unknown special hit method');
 // Applying G multiplier to move power is a research-only proxy, not confirmed final-damage x2.
 const p=power*multiplier;
 const x=(method==='physical'?strength:spirit)+p;
 const raw=method==='physical'?x/2-defense/4:x/10+x/3-defense/7;
 return Math.max(1,Math.min(999,Math.floor(raw)));
}
/** Deterministic but unverified healer fixture, separate from attack formula. */
export function researchSpecialHeal({power,spirit,multiplier=1}={}){
 if(!Number.isFinite(power)||power<1||!Number.isFinite(spirit)||spirit<0||
    !Number.isFinite(multiplier)||multiplier<=0)throw new RangeError('invalid heal inputs');
 return Math.max(1,Math.floor((power+spirit/3)*multiplier));
}
