import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync,mkdirSync } from 'node:fs';
import { build } from 'esbuild';
const root=process.cwd();
mkdirSync('.sites-runtime/test',{recursive:true});
const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
class Statement{
 constructor(sql,params=[]){this.sql=sql;this.params=params;}
 bind(...p){return new Statement(this.sql,p);}
 async all(){return {success:true,results:db.prepare(this.sql).all(...this.params),meta:{}};}
 async raw(){return db.prepare(this.sql).iterate?db.prepare(this.sql).all(...this.params).map(r=>Object.values(r)):[];}
 async run(){const result=db.prepare(this.sql).run(...this.params);return {success:true,results:[],meta:{changes:Number(result.changes)}};}
}
globalThis.__testEnv={DB:{prepare:s=>new Statement(s),batch:async statements=>{db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.all());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
globalThis.__testUser={userId:'account-a',email:'test@example.invalid'};
const plugin={name:'runtime-test',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'workers',namespace:'test'}));b.onResolve({filter:/^@\/app\/chatgpt-auth$/},()=>({path:'auth',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='workers'?'export const env=globalThis.__testEnv':'export async function getChatGPTUser(){return globalThis.__testUser}',loader:'js'}));}};
for(const [name,path]of Object.entries({list:'app/api/transfers/route.ts',detail:'app/api/transfers/[id]/route.ts',providers:'app/api/providers/route.ts',domain:'lib/transfers/domain.ts',whatsapp:'app/api/transfers/[id]/whatsapp/route.ts',health:'app/api/evolution/connection/route.ts'}))await build({entryPoints:[path],outfile:'.sites-runtime/test/'+name+'.mjs',bundle:true,platform:'node',format:'esm',plugins:[plugin],logLevel:'silent'});
const list=await import('../.sites-runtime/test/list.mjs');
const detail=await import('../.sites-runtime/test/detail.mjs');
const providers=await import('../.sites-runtime/test/providers.mjs');
const whatsapp=await import('../.sites-runtime/test/whatsapp.mjs');
const health=await import('../.sites-runtime/test/health.mjs');
const ctx=id=>({params:Promise.resolve({id})});
const req=(method,data)=>new Request('https://example.test/api/transfers',{method,headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify(data)});
const input={reservation:'WA-001',holder:'Pasajero de prueba',phone:'+573001234567',advisor:'Asesor de prueba',destination:'Palomino',hotel:'Hotel de prueba',passengers:2,infants:0,arrivalAirline:'Avianca',arrivalFlight:'AV123',arrivalDate:'2026-12-01',arrivalTime:'12:00',returnAirline:'LATAM',returnFlight:'LA123',returnDate:'2026-12-05',returnTime:'15:00',includesTours:true,tourNotes:'Tour de prueba',notes:''};
async function create(reservation,destination='Palomino'){const r=await list.POST(req('POST',{...input,reservation,destination}));assert.equal(r.status,201);return(await r.json()).data;}
async function preview(id){const r=await whatsapp.GET(new Request('https://example.test'),ctx(id));assert.equal(r.status,200);return(await r.json()).data;}
async function send(t,p,retry=false){return whatsapp.POST(req('POST',{version:p.version,previewHash:p.previewHash,retry}),ctx(t.id));}
let r=await health.GET();assert.equal((await r.json()).data.configured,false);
Object.assign(globalThis.__testEnv,{EVOLUTION_BASE_URL:'https://evolution.example.invalid',EVOLUTION_INSTANCE:'Test_Instance',EVOLUTION_API_KEY:'TEST_KEY_DO_NOT_USE'});
let calls=0,mode='success',state='open',stateHttp=200,allowedNumber='573235760342';
globalThis.fetch=async(url,init)=>{
 assert.equal(init.headers.apikey,'TEST_KEY_DO_NOT_USE');assert.equal(init.redirect,'error');
 if(url==='https://evolution.example.invalid/instance/connectionState/Test_Instance')return Response.json({instance:{instanceName:'Test_Instance',state}},{status:stateHttp});
 if(url==='https://evolution.example.invalid/message/sendText/Test_Instance'){
  calls++;const b=JSON.parse(init.body);assert.equal(init.method,'POST');assert.deepEqual(Object.keys(b).sort(),['number','text']);assert.equal(b.number,allowedNumber);assert.match(b.text,/Tour de prueba/);assert.match(b.text,/Regreso|REGRESO/);
  if(mode==='network')throw new Error('Simulated timeout');
  if(mode==='reject')return Response.json({error:'Rejected'},{status:400});
  if(mode==='server')return Response.json({error:'Server error'},{status:500});
  if(mode==='missing')return Response.json({status:'PENDING'});
  return Response.json({key:{id:'evolution-'+calls,fromMe:true,remoteJid:allowedNumber+'@s.whatsapp.net'},status:'PENDING'});
 }
 throw new Error('Unexpected remote call');
};
r=await health.GET();const status=(await r.json()).data;assert.equal(status.connected,true);assert.equal(status.instance,'Test_Instance');assert.equal(JSON.stringify(status).includes('TEST_KEY'),false);
let t=await create('WA-001'),p=await preview(t.id);assert.equal(p.canSend,true);assert.equal(p.number,allowedNumber);
r=await send(t,p);assert.equal(r.status,200);assert.equal((await r.json()).data.delivery.status,'accepted');assert.equal(calls,1);
r=await send(t,p);assert.equal((await r.json()).data.alreadySent,true);assert.equal(calls,1);
t=await create('WA-CONCURRENT');p=await preview(t.id);let before=calls;const both=await Promise.all([send(t,p),send(t,p)]);assert.equal(both.filter(x=>x.status===200).length,1);assert.equal(calls,before+1);
t=await create('WA-OFFLINE');p=await preview(t.id);state='close';before=calls;r=await send(t,p);assert.equal(r.status,409);assert.equal(calls,before);state='open';stateHttp=401;r=await send(t,p);assert.equal(r.status,409);assert.equal(calls,before);stateHttp=200;
t=await create('WA-REJECTED');p=await preview(t.id);mode='reject';r=await send(t,p);assert.equal((await r.json()).data.delivery.status,'failed');before=calls;r=await send(t,p);assert.equal(r.status,409);assert.equal(calls,before);mode='success';r=await send(t,p,true);assert.equal((await r.json()).data.delivery.status,'accepted');assert.equal(calls,before+1);
for(const m of ['network','server','missing']){t=await create('WA-'+m);p=await preview(t.id);mode=m;r=await send(t,p);assert.equal((await r.json()).data.delivery.status,'uncertain');before=calls;r=await send(t,p,true);assert.equal(r.status,409);assert.equal(calls,before);}mode='success';
t=await create('WA-EMAIL','Cartagena');p=await preview(t.id);assert.equal(p.canSend,false);before=calls;r=await send(t,p);assert.equal(r.status,409);assert.equal(calls,before);
t=await create('WA-CANCELLED');await detail.PATCH(req('PATCH',{version:1,input:{...input,reservation:'WA-CANCELLED'},status:'Cancelado'}),ctx(t.id));p=await preview(t.id);assert.equal(p.canSend,false);r=await send(t,p);assert.equal(r.status,409);
t=await create('WA-CHANGED');p=await preview(t.id);await providers.PUT(req('PUT',{destination:'Palomino',name:'Other contact',channel:'whatsapp',contact:'+573001112233'}));r=await send(t,p);assert.equal(r.status,409);
p=await preview(t.id);allowedNumber='573001112233';r=await send(t,p);assert.equal((await r.json()).data.delivery.number,allowedNumber);
t=await create('WA-INSTANCE-CHANGE');p=await preview(t.id);globalThis.__testEnv.EVOLUTION_INSTANCE='Changed_Instance';r=await send(t,p);assert.equal(r.status,409);globalThis.__testEnv.EVOLUTION_INSTANCE='Test_Instance';
const own=t.id;globalThis.__testUser={userId:'account-b',email:'other@example.invalid'};r=await whatsapp.GET(new Request('https://example.test'),ctx(own));assert.equal(r.status,404);r=await send(t,p);assert.equal(r.status,404);
globalThis.__testUser=null;r=await health.GET();assert.equal(r.status,401);r=await send(t,p);assert.equal(r.status,401);
globalThis.__testUser={userId:'account-a',email:'test@example.invalid'};r=await whatsapp.POST(req('POST',{version:p.version,previewHash:p.previewHash,number:'attacker'}),ctx(own));assert.equal(r.status,422);
r=await whatsapp.POST(new Request('https://example.test',{method:'POST',headers:{origin:'https://foreign.test'},body:JSON.stringify({version:p.version,previewHash:p.previewHash})}),ctx(own));assert.equal(r.status,403);
globalThis.__testEnv.EVOLUTION_BASE_URL='http://insecure.invalid';r=await health.GET();assert.equal((await r.json()).data.configured,false);
console.log('PASS: Evolution status, secret isolation, private access, provider routing, international number, review hashes, concurrent duplicate protection, explicit retry, offline prevention, cancelled requests, and uncertain-result blocking. All Evolution calls simulated.');db.close();
