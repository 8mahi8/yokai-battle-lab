/**
 * V3-4-21 — presentation-only trust boundary for Firebase snapshot delivery.
 *
 * The host publishes canonical revisions, not motion start times. A guest may
 * see revisions 1..4 as one later snapshot. Replaying a freshly FULL-length
 * enemy-wheel freeze then would invent a second motion on that device.
 *
 * Only admit the previous view as a possible motion baseline for ONE new
 * action in ONE adjacent authoritative revision, with no active FIFO scene.
 * Even this is not cross-device frame sync: the exact packet delay is unknown.
 * No writes, clocks, combat rules, authentication or replay-state storage.
 */
const validRevision=n=>Number.isSafeInteger(n)&&n>=0;
export function assessSeatMotionDelivery({
 previousView=null,currentView,freshCues=0,skipped=0,sceneActive=false
}={}){
 if(!currentView||!validRevision(currentView.revision)||
    !Number.isSafeInteger(freshCues)||freshCues<0||
    !Number.isSafeInteger(skipped)||skipped<0||
    typeof sceneActive!=='boolean')
  throw new TypeError('valid projected snapshot delivery required');
 if(previousView!==null&&!validRevision(previousView.revision))
  throw new TypeError('valid previous snapshot required');
 const revisionGap=previousView===null?null:
  currentView.revision-previousView.revision;
 let reason='sequential_single_action';
 if(previousView===null)reason='initial_attach';
 else if(revisionGap<=0)reason='repeat_or_rewind';
 else if(revisionGap!==1)reason='revision_gap';
 else if(skipped>0)reason='visual_history_skipped';
 else if(freshCues!==1)reason='ambiguous_action_batch';
 else if(sceneActive)reason='animation_already_active';
 else if(currentView.winner!==null)reason='match_finished';
 return Object.freeze({allowOpponentHold:reason==='sequential_single_action',
   reason,revisionGap,freshCues,skipped});
}
