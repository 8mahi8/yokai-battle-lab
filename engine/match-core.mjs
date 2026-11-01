/**
 * V3-1 canonical match owner — one input boundary to the existing combat
 * simulation. The transport may request a command or next AI action, but
 * cannot mutate HP, Soul, wheel, statuses, RNG, or action credits directly.
 *
 * IMPORTANT: initial pass is behavior-preserving: createCombat still owns
 * legacy sub-systems internally until their effect/hook contracts are migrated.
 * This is NOT an additional engine, not original YW2 numerical proof, and
 * not a Firebase or UI adapter. It does not expose the combat instance.
 */
import {createCombat} from './combat.mjs';
import {applyMatchCommand} from './match-command-kernel.mjs';
import {inspectCoreTimeDomains} from './core-time-domains.mjs';

export function createMatchCore(battleOptions){
 if(!battleOptions||typeof battleOptions!=='object'||Array.isArray(battleOptions))
  throw new TypeError('valid canonical battle options required');
 const combat=createCombat(battleOptions);
 return Object.freeze({
  /** Called only after match protocol validates and sequences host-side seat inputs. */
  applyNormalizedCommand(side,command,{rotationAtMs=0}={}){
   return applyMatchCommand(combat,side,command,{rotationAtMs});
  },
  /** The only authorized automatic action step. */
  advanceAuto(){return combat.step();},
  /** Canonical truth: deep-clone boundary remains in createCombat.snapshot(). */
  snapshot(){return combat.snapshot();},
  /** Read-only tentative future, never advances the real battle. */
  preview(count=5){return combat.preview(count);},
  /** Read-only diagnostics; never serialize this into Firebase snapshots. */
  inspectTimeDomains(){return inspectCoreTimeDomains(combat.snapshot());},
  /** Diagnostic-only authoring source IDs; never part of network snapshots. */
  inspectCausality(){return combat.inspectCausality();}
 });
}
