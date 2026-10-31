/**
 * V3-4-24 — visual treatment of the six existing ORIGINAL RENTAL moves.
 * NOT original 3DS animation assets, move effects, hit counts or durations.
 * Source of the effect CATEGORY is the canonical rental move master.
 *
 * Only use this profile when the authoritative resolved event's caster and
 * effect category agree with the unchanged rental slot. Custom rosters and
 * source-backed original-YW2 research moves must not inherit slot graphics.
 * This projects pictures only; never changes an impact, HP or target.
 */
import {RENTAL_SQUAD} from '../content/rental-roster.mjs';
import {RENTAL_SOULTIMATE_MOVES} from '../content/rental-soultimate-moves.mjs';

const treatmentByKind=Object.freeze({
 damage:'strike',drain:'siphon',buff:'rally',
 'damage-status':'storm','revive-heal':'renew',debuff:'suppress'
});
const expectedImpactKinds=Object.freeze({
 damage:['damage'],drain:['drain'],'buff':['buff'],
 'damage-status':['damage-status'],'revive-heal':['heal','revive'],
 debuff:['debuff']
});
export const RENTAL_SPECIAL_TREATMENTS=Object.freeze(RENTAL_SOULTIMATE_MOVES.map((move,i)=>
 Object.freeze({slot:i+1,moveId:move.id,effectKind:move.kind,
  treatment:treatmentByKind[move.kind],evidence:'visual-playtest'})));

export function projectSoultimateVisual(event,squads){
 if(!event||event.type!=='special'||event.referenceSoultimate||
    !Array.isArray(squads)||squads.length!==2)return null;
 const match=/^([AB])([1-6])$/.exec(event.actor??'');
 if(!match)return null;
 const side=match[1]==='A'?0:1,index=Number(match[2])-1;
 const caster=squads[side]?.[index],original=RENTAL_SQUAD[index];
 const candidate=RENTAL_SPECIAL_TREATMENTS[index];
 if(!caster||caster.id!==event.actor||caster.name!==original.name||
    caster.skill!==original.skill)return null;
 const impacts=event.impacts;
 if(!Array.isArray(impacts)||!impacts.length||
    !impacts.every(i=>expectedImpactKinds[candidate.effectKind].includes(i.kind)))
  return null;
 return candidate;
}
