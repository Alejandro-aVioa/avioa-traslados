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
for(const [name,path]of Object.entries({list:'app/api/transfers/route.ts',detail:'app/api/transfers/[id]/route.ts',providers:'app/api/providers/route.ts',domain:'lib/transfers/domain.ts'}))await build({entryPoints:[path],outfile:'.sites-runtime/test/'+name+'.mjs',bundle:true,platform:'node',format:'esm',plugins:[plugin],logLevel:'silent'});
const list=await import('../.sites-runtime/test/list.mjs');
const detail=await import('../.sites-runtime/test/detail.mjs');
const providers=await import('../.sites-runtime/test/providers.mjs');
const domain=await import('../.sites-runtime/test/domain.mjs');
const input={reservation:'TEST-001',holder:'Pasajero de prueba',phone:'+573001234567',advisor:'Asesor de prueba',destination:'Cartagena',hotel:'Hotel de prueba',passengers:2,infants:1,arrivalAirline:'Avianca',arrivalFlight:'AV123',arrivalDate:'2026-12-01',arrivalTime:'12:00',returnAirline:'LATAM',returnFlight:'LA123',returnDate:'2026-12-05',returnTime:'15:00',includesTours:true,tourNotes:'Tour de prueba',notes:''};
const req=(method,data,path='/api/transfers')=>new Request('https://example.test'+path,{method,headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify(data)});
const ctx=id=>({params:Promise.resolve({id})});
let r=await list.POST(req('POST',input));assert.equal(r.status,201);let t=(await r.json()).data;assert.equal(t.status,'Pendiente');assert.equal(t.ownerId,undefined);
r=await list.GET();assert.equal((await r.json()).data.length,1);
r=await list.POST(req('POST',input));assert.equal(r.status,409);assert.equal(db.prepare('SELECT count(*) AS n FROM transfer_events').get().n,1);
r=await list.POST(req('POST',{...input,reservation:'BAD',returnDate:'2026-11-01'}));assert.equal(r.status,422);
r=await list.POST(req('POST',{...input,reservation:'BAD',arrivalDate:'2026-02-30'}));assert.equal(r.status,422);
r=await list.POST(req('POST',{...input,reservation:'BAD',passengers:0}));assert.equal(r.status,422);
r=await list.POST(req('POST',{...input,reservation:'BAD',ownerId:'attacker'}));assert.equal(r.status,422);
r=await list.POST(req('POST',{...input,reservation:'BAD',tourNotes:''}));assert.equal(r.status,422);
r=await detail.PATCH(req('PATCH',{version:1,input,status:'Confirmado'}),ctx(t.id));assert.equal(r.status,200);assert.equal((await r.json()).data.version,2);
r=await detail.PATCH(req('PATCH',{version:1,input,status:'Cancelado'}),ctx(t.id));assert.equal(r.status,409);assert.equal(db.prepare('SELECT count(*) AS n FROM transfer_events').get().n,2);
r=await detail.GET(new Request('https://example.test'),ctx(t.id));assert.equal((await r.json()).events.length,2);
globalThis.__testUser={userId:'account-b',email:'other@example.invalid'};
r=await list.GET();assert.equal((await r.json()).data.length,0);
r=await detail.GET(new Request('https://example.test'),ctx(t.id));assert.equal(r.status,404);
r=await detail.PATCH(req('PATCH',{version:2,input,status:'Cancelado'}),ctx(t.id));assert.equal(r.status,404);
r=await list.POST(req('POST',input));assert.equal(r.status,201);
r=await providers.PUT(req('PUT',{destination:'Cartagena',name:'Proveedor B',channel:'email',contact:'test@example.invalid'}));assert.equal(r.status,200);
r=await providers.GET();assert.equal((await r.json()).data[0].name,'Proveedor B');
globalThis.__testUser={userId:'account-a',email:'test@example.invalid'};
r=await providers.GET();assert.equal((await r.json()).data[0].name,'Transturismo Cartagena');
r=await providers.PUT(req('PUT',{destination:'Cartagena',name:'Bad',channel:'email',contact:'invalid'}));assert.equal(r.status,422);
r=await list.POST(new Request('https://example.test/api/transfers',{method:'POST',headers:{origin:'https://foreign.test'},body:JSON.stringify(input)}));assert.equal(r.status,403);
globalThis.__testUser=null;
r=await list.GET();assert.equal(r.status,401);
r=await list.POST(req('POST',input));assert.equal(r.status,401);
r=await providers.GET();assert.equal(r.status,401);
assert.equal(domain.legacyPayload(input)['Hora de regreso '],'15:00');assert.equal(domain.legacyPayload(input).Destino,'Cartagena');assert.match(domain.providerMessage(input),/Tour de prueba/);
assert.equal(db.prepare("SELECT status FROM transfers WHERE owner_id='account-a'").get().status,'Confirmado');
console.log('PASS: persistence, validation, duplicate handling, optimistic updates, history, account isolation, authorization, provider overrides and n8n compatibility');
db.close();
