// Animation-state smoke test. Minimal DOM double; runs with Node without dependencies.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8');
const script=src.match(/<script>([\s\S]+?)<\/script>/)?.[1];
assert(script,'script missing');
const ids=[...src.matchAll(/\bid="([a-zA-Z][a-zA-Z0-9]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,'duplicate IDs');
const nodes={},handlers={},frames=[];
function node(id){return nodes[id]??={id,style:{},textContent:'',innerHTML:'',dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=String(v)},addEventListener(k,f){handlers[id+':'+k]=f}}}
for(const id of ids)node(id);
for(const id of ['idle','attack','magic','curse','special','hit','faint','walk'])node('action-'+id).dataset.action=id;
for(const id of ['front','quarter','back'])node('view-'+id).dataset.view=id;
const document={getElementById:id=>nodes[id]||null,querySelectorAll:q=>Object.values(nodes).filter(n=>q==='.action'?n.id.startsWith('action-'):n.id.startsWith('view-'))};
vm.runInNewContext(script,{document,window:{addEventListener(){}},performance:{now:()=>0},requestAnimationFrame:f=>frames.push(f),Math,console});
let ms=0;
function frame(){ms+=50;assert(frames.length);frames.shift()(ms)}
for(let i=0;i<10;i++)frame();
for(const id of ['attack','magic','curse','special','hit','faint','walk']){handlers['action-'+id+':click']();for(let i=0;i<65;i++)frame()}
for(const id of ['back','quarter','front']){handlers['view-'+id+':click']();frame()}
console.log('PASS: 8 actions, 3 views, all animation frames, unique SVG/DOM IDs');
