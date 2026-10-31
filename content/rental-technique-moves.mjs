/**
 * Phase 1.6: SINGLE authoring source of current six rental Techniques.
 * These are PLAYTEST fixture values, NOT confirmed Yo-kai Watch 2 values.
 * Do not confuse a healing action (no damage hits) with a zero-turn move.
 */
const fixtures=[
 ['damage',45],['heal',50],['damage',35],
 ['damage',65],['heal',50],['damage',25]
];
export const RENTAL_TECHNIQUE_MOVES=Object.freeze(fixtures.map(([kind,power],index)=>{
 const id='rental-'+String(index+1).padStart(2,'0')+':technique';
 return Object.freeze({
  id,slot:'technique',kind,power,
  // Neutral is the existing six-character research default, not an
  // observation that the original Yo-kai's Technique has this attribute.
  element:'neutral',hits:kind==='damage'?1:null,
  evidence:'fixture'
 });
}));
