/**
 * Pointer geometry for one-step circular member-wheel gestures.
 * Stateless on purpose: live touch state belongs to createMatchStage, never
 * the authoritative battle protocol. The engine alone validates rotations.
 */
const TAU=Math.PI*2;
export function wheelAngle(x,y,centerX,centerY){
 if(![x,y,centerX,centerY].every(Number.isFinite))throw new TypeError('finite pointer geometry required');
 return Math.atan2(y-centerY,x-centerX);
}
export function signedWheelDelta(start,end){
 if(!Number.isFinite(start)||!Number.isFinite(end))throw new TypeError('finite angles required');
 return Math.atan2(Math.sin(end-start),Math.cos(end-start));
}
/** 36° threshold prevents an ordinary medal tap becoming a rotation. */
export function wheelTurnFromDelta(delta,threshold=Math.PI/5){
 if(!Number.isFinite(delta)||!Number.isFinite(threshold)||threshold<=0||threshold>=Math.PI)
  throw new RangeError('invalid angular turn threshold');
 return Math.abs(delta)>=threshold?(delta>0?1:-1):0;
}
export function wheelGestureAt({x,y,centerX,centerY,radius,startAngle}){
 if(!Number.isFinite(radius)||radius<=0)throw new RangeError('invalid wheel radius');
 const dist=Math.hypot(x-centerX,y-centerY);
 // Ignore a movement through the dead center: its angle is undefined.
 if(dist<radius*.22)return null;
 const angle=wheelAngle(x,y,centerX,centerY);
 const delta=signedWheelDelta(startAngle,angle);
 return {delta,direction:wheelTurnFromDelta(delta),degrees:Math.round(delta*180/Math.PI)};
}
