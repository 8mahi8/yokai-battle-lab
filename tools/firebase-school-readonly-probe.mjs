/**
 * Phase38: strictly READ ONLY public Firebase REST reachability.
 * Does NOT query .settings/rules.json (requires admin OAuth), does NOT
 * read any existing match/room, does NOT inspect or print response body,
 * and never writes to the user's shared database.
 * Can establish whether unauthenticated GET is allowed from CI, but NOT
 * whether POST/PUT succeeds or iPad Safari accepts Firebase SDK traffic.
 */
const base='https://mygame-df915-default-rtdb.firebaseio.com';
const unusedProbePath='/yokaiRoomsV1/__phase38_readonly_probe_no_game_room__.json';
const timeout=7500;
const abort=new AbortController();
const timer=setTimeout(()=>abort.abort(),timeout);
try{
 const res=await fetch(base+unusedProbePath,{
  method:'GET',
  redirect:'error',
  cache:'no-store',
  credentials:'omit',
  signal:abort.signal,
  headers:{Accept:'application/json'}
 });
 await res.body?.cancel();
 const status=res.status;
 const label=status===200?'UNAUTH_READ_HTTP_OK':
   status===401||status===403?'UNAUTH_READ_PERMISSION_DENIED':'UNAUTH_READ_HTTP_OTHER';
 console.log('FIREBASE-SCHOOL-READONLY '+JSON.stringify({
  status:label,httpStatus:status,
  scope:'reserved_non_room_key_under_yokaiRoomsV1',
  readOnly:true,auth:false,bodyInspected:false,writeTested:false,
  schoolSafariTested:false
 }));
}catch(error){
 console.log('FIREBASE-SCHOOL-READONLY '+JSON.stringify({
  status:'NETWORK_OR_SERVER_UNVERIFIED',errorClass:abort.signal.aborted?'timeout':'network',
  readOnly:true,auth:false,bodyInspected:false,writeTested:false,
  schoolSafariTested:false
 }));
}finally{clearTimeout(timer)}
