/** Read real DOM *result text*, not a PASS string in serialized scripts.
 * Chromium --dump-dom includes inline <script> bodies, so includes('PASS')
 * yields a dangerous false positive even for a stalled/failed two-seat match.
 */
export function renderedQaResult(dom,{id='result',tag='strong'}={}){
 if(typeof dom!=='string'||!(/^[a-z][a-z0-9-]*$/).test(tag)||
    !(/^[a-z][a-z0-9-]*$/).test(id))
  throw new TypeError('valid rendered QA DOM and tag/id required');
 const match=dom.match(new RegExp('<'+tag+' id="'+id+'">([^<]*)<\\/'+tag+'>'));
 return match?.[1]??null;
}
export function renderedQaPassed(dom,sentinel,{id='result',tag='strong'}={}){
 if(typeof sentinel!=='string'||!sentinel.endsWith('-PASS'))
  throw new TypeError('full PASS prefix required');
 const visible=renderedQaResult(dom,{id,tag});
 return visible!==null&&visible.startsWith(sentinel+' ');
}
