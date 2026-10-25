/**
 * PLAYTEST ESTIMATES, NOT Yo-kai Watch 2 numerical facts.
 * Adjust these few values after playing with friends on school iPads.
 * Only the owner's NON-ATTACK +5 has direct player-research support.
 * Attack/technique and Zero Watch Poke are deliberately rough placeholders.
 * Do not import these values into evidence comparators or claim ROM parity.
 * Sources: docs/PHASE21D_B4_ATTACK_SOUL_BONUS_AUDIT_20261025.md
 */
export const PLAYTEST_SOUL_TUNING=Object.freeze({
  nonAttackGain:5,          // supported by published player experiment
  attackGain:8,             // tentative: normal physical attack
  techniqueGain:8,          // tentative: damaging technique
  vulnerableHitBonus:4,    // tentative: hit loafing / negatively Inspirited foe
  pokeMaxTransfer:35,      // tentative: Soul drained from foe, first live ally recipient not source-confirmed
  pokeNormalDamage:35,    // tentative: regular Poke HP damage
  pokeHeavyDamage:999,   // PvP effect category and 999 are described in YW2 PvP sources
  pokeDamageWeight:49,   // unverified friendly-match outcome odds (%)
  pokeSoulWeight:50,     // unverified friendly-match outcome odds (%)
  pokeHeavyWeight:1      // unverified friendly-match outcome odds (%)
});

/** Source-grounded PvP categories, UNVERIFIED odds. Host-seeded RNG chooses.
 * Story-only money/friendship rewards must never be part of PvP.
 * See docs/PHASE31_POKE_PVP_SOURCE_AUDIT_20261026.md
 */
export function choosePlaytestPokeOutcome(roll){
 if(!Number.isFinite(roll)||roll<0||roll>=1)
  throw new RangeError('poke roll must be a finite number in [0,1)');
 const p=PLAYTEST_SOUL_TUNING;
 if(p.pokeDamageWeight+p.pokeSoulWeight+p.pokeHeavyWeight!==100)
  throw new RangeError('poke weights must sum to 100');
 const percent=roll*100;
 return percent<p.pokeDamageWeight?'damage':
  percent<p.pokeDamageWeight+p.pokeSoulWeight?'soul-drain':'heavy-hit';
}
