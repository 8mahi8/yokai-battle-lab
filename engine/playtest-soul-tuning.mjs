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
  pokeMaxTransfer:35       // tentative: cap of Soul stolen from foe and granted to first living ally
});
