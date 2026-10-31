/**
 * Phase 21C-B research diagnostic ONLY: compare a controlled recorded
 * FIRST ACTION with the YW2 94-row wait model.
 *
 * This does not use seeded browser RNG, assert the original 3DS tie rule,
 * or change createMatchProtocol / ordinary school matches.
 *
 * Accepted baseline: two fixed teams of six, known effective Speed,
 * no Flash/special opening mechanics, no wheel motion since registration,
 * matching-time and visible front coincide.
 * If the opening front changed, the original's matching-time priority
 * rights are NOT numerically established: the answer is "indeterminate".
 */
import { initialWaitRange } from './phase1.mjs';

const ID = /^[AB][1-6]$/;

function validateOffsets(offsets,label){
  if(!Array.isArray(offsets)||offsets.length!==2||
      offsets.some(x=>!Number.isInteger(x)||x<0||x>5))
    throw new TypeError(label+' must be two offsets from 0 through 5');
  return [...offsets];
}
function validateTeams(teams){
  if(!Array.isArray(teams)||teams.length!==2||
      teams.some(side=>!Array.isArray(side)||side.length!==6))
    throw new TypeError('teams must contain two teams of exactly six');
  return teams.map((team, side)=>team.map((unit,i)=>{
    if(unit===null||typeof unit!=='object'||Array.isArray(unit)||
        !Number.isInteger(unit.speed)||unit.speed<1)
      throw new TypeError('invalid effective speed at '+side+':'+i);
    return {id:(side===0?'A':'B')+(i+1),speed:unit.speed};
  }));
}
const front=(team,offset)=>[0,1,2].map(i=>team[(offset+i)%6]);
const ids=units=>units.map(u=>u.id);

/**
 * @returns {{
 *  status: 'not-observed'|'indeterminate'|'consistent-with-table'|'inconsistent-with-table',
 *  confidence: 'community-reference-only', visibleFront:string[][],
 *  matchingFront:string[][], firstWaitRanges:null|Array<{id:string,speed:number,min:number,max:number}>,
 *  possibleFirstActors:null|string[], forcedFirstActor:null|string,
 *  observedFirstActor:null|string, limitations:string[]
 * }}
 */
export function auditFirstAction({
  teams,
  visibleStartOffsets=[0,0],
  matchingStartOffsets=[0,0],
  wheelMovedSinceRegistration=false,
  observedFirstActor=null
}={}){
  const roster=validateTeams(teams);
  const visible=validateOffsets(visibleStartOffsets,'visibleStartOffsets');
  const matching=validateOffsets(matchingStartOffsets,'matchingStartOffsets');
  if(typeof wheelMovedSinceRegistration!=='boolean')
    throw new TypeError('wheelMovedSinceRegistration must be boolean');
  if(observedFirstActor!==null&&
      (typeof observedFirstActor!=='string'||!ID.test(observedFirstActor)))
    throw new TypeError('observedFirstActor must be A1–A6, B1–B6 or null');

  const visibleFront=roster.map((team,side)=>ids(front(team,visible[side])));
  const matchingFront=roster.map((team,side)=>ids(front(team,matching[side])));
  const changed=wheelMovedSinceRegistration||
    visible.some((offset,side)=>offset!==matching[side]);
  const limitations=[
    'Comparison is to community-published YW2 wait ranges, not measured 3DS RNG or ROM scheduling.',
    'Equal-wait tie priority is unknown; equal values count as possible actors.',
    'Effective Speed and absence of special opening modifiers must be independently checked.'
  ];

  // Original matching-time front rights can remain significant after
  // prebattle wheel changes. Do not pretend a nominal visible-front table
  // calculation disproves a player's first-action observation.
  if(changed) return {
    status:'indeterminate',confidence:'community-reference-only',
    visibleFront,matchingFront,firstWaitRanges:null,
    possibleFirstActors:null,forcedFirstActor:null,observedFirstActor,
    limitations:[...limitations,
      'Opening wheel/registered-front mismatch: priority credit timing and amount are not source-verified.']
  };

  const initial=roster.flatMap((team,side)=>front(team,visible[side]));
  const ranges=initial.map(unit=>{
    const [min,max]=initialWaitRange(unit.speed);
    return {id:unit.id,speed:unit.speed,min,max};
  });
  // Existence proof only: actor i can have the minimal wait if its minimum
  // is <= EVERY competitor's maximum. This is a necessary/sufficient
  // condition given independent inclusive integer waits and UNKNOWN ties.
  const possible=ranges.filter((r,i)=>
    ranges.every((other,j)=>i===j||r.min<=other.max)).map(x=>x.id);
  const forced=possible.length===1?possible[0]:null;
  return {
    status:observedFirstActor===null?'not-observed':
      possible.includes(observedFirstActor)?'consistent-with-table':'inconsistent-with-table',
    confidence:'community-reference-only',
    visibleFront,matchingFront,firstWaitRanges:ranges,
    possibleFirstActors:possible,forcedFirstActor:forced,observedFirstActor,
    limitations
  };
}
