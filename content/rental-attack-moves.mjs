/**
 * Single authoring source for the six ORIGINAL rental characters' normal
 * physical moves. Values are trial fixtures, NOT original Yo-kai Watch 2
 * verified values. Keep this separate from the legacy actor-shaped roster.
 */
const powers=[55,40,45,45,45,65];
export const RENTAL_ATTACK_MOVES=Object.freeze(powers.map((power,index)=>
 Object.freeze({
  id:'rental-'+String(index+1).padStart(2,'0')+':attack',
  slot:'attack',power,hits:1,evidence:'fixture'
 })
));
