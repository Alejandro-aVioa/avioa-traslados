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
for(const [name,path]of Object.entries({list:'app/api/transfers/route.ts',detail:'app/api/transfers/[id]/route.ts',providers:'app/api/providers/route.ts',domain:'lib/transfers/domain.ts',connect:'app/api/gmail/connect/route.ts',callback:'app/api/gmail/callback/route.ts',connection:'app/api/gmail/connection/route.ts',email:'app/api/transfers/[id]/email/route.ts',crypt:'lib/gmail/crypto.ts',mime:'lib/gmail/mime.ts'}))await build({entryPoints:[path],outfile:'.sites-runtime/test/'+name+'.mjs',bundle:true,platform:'node',format:'esm',plugins:[plugin],logLevel:'silent'});
const routes={};for(const name of ['list','detail','providers','domain','connect','callback','connection','email','crypt','mime'])routes[name]=await import('../.sites-runtime/test/'+name+'.mjs');
const req=(method,data,path='/api/transfers')=>new Request('https://example.test'+path,{method,headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify(data)});
const ctx=id=>({params:Promise.resolve({id})});
const input={reservation:'GMAIL-001',holder:'Pasajero de prueba',phone:'+573001234567',advisor:'Asesor de prueba',destination:'Cartagena',hotel:'Hotel de prueba',passengers:2,infants:0,arrivalAirline:'Avianca',arrivalFlight:'AV123',arrivalDate:'2026-12-01',arrivalTime:'12:00',returnAirline:'LATAM',returnFlight:'LA123',returnDate:'2026-12-05',returnTime:'15:00',includesTours:true,tourNotes:'Tour a Barú',notes:'Atención especial'};
let r=await routes.connection.GET();assert.equal((await r.json()).data.configured,false);
r=await routes.connect.GET();assert.equal(r.status,503);
Object.assign(globalThis.__testEnv,{GMAIL_CLIENT_ID:'test-client',GMAIL_CLIENT_SECRET:'test-client-secret',GMAIL_TOKEN_ENCRYPTION_KEY:routes.crypt.base64url(new Uint8Array(32).fill(9)),GMAIL_REDIRECT_URI:'https://example.test/api/gmail/callback'});
let gmailCalls=0,sendMode='success',tokenCalls=0;
globalThis.fetch=async(url,init)=>{
 if(url==='https://oauth2.googleapis.com/token'){tokenCalls++;return Response.json({access_token:'TEST_ACCESS',refresh_token:'TEST_REFRESH',scope:'https://www.googleapis.com/auth/gmail.send openid email'});}
 if(url==='https://openidconnect.googleapis.com/v1/userinfo')return Response.json({email:'sender@example.invalid',email_verified:true});
 if(url==='https://gmail.googleapis.com/gmail/v1/users/me/messages/send'){
  gmailCalls++;assert.equal(init.headers.Authorization,'Bearer TEST_ACCESS');
  const mime=new TextDecoder().decode(routes.crypt.from64(JSON.parse(init.body).raw));assert.match(mime,/From: sender@example.invalid/);assert.match(mime,/To: transturismocartagena@gmail.com/);assert.match(mime,/MIME-Version: 1.0/);
  const content=mime.split('\r\n\r\n')[1].replace(/\r\n/g,'');assert.match(Buffer.from(content,'base64').toString('utf8'),/Tour a Barú/);
  if(sendMode==='network')throw new Error('Simulated timeout');
  if(sendMode==='reject')return Response.json({error:{message:'rejected'}},{status:400});
  return Response.json({id:'gmail-message-'+gmailCalls,labelIds:['SENT']});
 }
 throw new Error('Unexpected outbound request: '+url);
};
r=await routes.connect.GET();assert.equal(r.status,302);const authorization=new URL(r.headers.get('location'));assert.equal(authorization.origin,'https://accounts.google.com');assert.equal(authorization.searchParams.get('scope'),'https://www.googleapis.com/auth/gmail.send openid email');assert.equal(authorization.searchParams.get('code_challenge_method'),'S256');
const state=authorization.searchParams.get('state');const cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
r=await routes.callback.GET(new Request('https://example.test/api/gmail/callback?state='+state+'&code=FAKE_CODE',{headers:{cookie:'__Host-gmail_oauth=wrong'}}));assert.equal(r.headers.get('location'),'/?gmail=error');assert.equal(tokenCalls,0);
r=await routes.callback.GET(new Request('https://example.test/api/gmail/callback?state='+state+'&code=FAKE_CODE',{headers:{cookie}}));assert.equal(r.headers.get('location'),'/?gmail=connected');
const conn=db.prepare('SELECT * FROM gmail_connections').get();assert.notEqual(conn.refresh_token,'TEST_REFRESH');assert.equal(conn.refresh_token.includes('TEST_REFRESH'),false);await assert.rejects(routes.crypt.decrypt(conn.refresh_token,globalThis.__testEnv.GMAIL_TOKEN_ENCRYPTION_KEY,'account-b'));
r=await routes.callback.GET(new Request('https://example.test/api/gmail/callback?state='+state+'&code=FAKE_CODE',{headers:{cookie}}));assert.equal(r.headers.get('location'),'/?gmail=error');
r=await routes.connection.GET();const status=(await r.json()).data;assert.equal(status.connected,true);assert.equal(status.email,'sender@example.invalid');assert.equal(JSON.stringify(status).includes('TEST_REFRESH'),false);
async function create(reservation){const r=await routes.list.POST(req('POST',{...input,reservation}));assert.equal(r.status,201);return(await r.json()).data;}
async function preview(id){const r=await routes.email.GET(new Request('https://example.test'),ctx(id));assert.equal(r.status,200);return(await r.json()).data;}
async function send(t,p,retry=false){return routes.email.POST(req('POST',{version:p.version,previewHash:p.previewHash,retry}),ctx(t.id));}
let t=await create('GMAIL-001'),p=await preview(t.id);assert.equal(p.canSend,true);
r=await send(t,p);assert.equal(r.status,200);assert.equal((await r.json()).data.delivery.status,'sent');assert.equal(gmailCalls,1);
r=await send(t,p);assert.equal((await r.json()).data.alreadySent,true);assert.equal(gmailCalls,1);
t=await create('GMAIL-CONCURRENT');p=await preview(t.id);const before=gmailCalls;const both=await Promise.all([send(t,p),send(t,p)]);assert.equal(both.filter(x=>x.status===200).length,1);assert.equal(gmailCalls,before+1);
t=await create('GMAIL-FAILED');p=await preview(t.id);sendMode='reject';r=await send(t,p);assert.equal((await r.json()).data.delivery.status,'failed');const failedCount=gmailCalls;r=await send(t,p);assert.equal(r.status,409);assert.equal(gmailCalls,failedCount);sendMode='success';r=await send(t,p,true);assert.equal((await r.json()).data.delivery.status,'sent');assert.equal(gmailCalls,failedCount+1);
t=await create('GMAIL-UNCERTAIN');p=await preview(t.id);sendMode='network';r=await send(t,p);assert.equal((await r.json()).data.delivery.status,'uncertain');const uncertainCount=gmailCalls;r=await send(t,p,true);assert.equal(r.status,409);assert.equal(gmailCalls,uncertainCount);sendMode='success';
t=await create('GMAIL-CHANGED');p=await preview(t.id);await routes.providers.PUT(req('PUT',{destination:'Cartagena',name:'Changed provider',channel:'email',contact:'other@example.invalid'}));r=await send(t,p);assert.equal(r.status,409);
const otherId=t.id;globalThis.__testUser={userId:'account-b',email:'other@example.invalid'};r=await routes.email.GET(new Request('https://example.test'),ctx(otherId));assert.equal(r.status,404);r=await routes.connection.GET();assert.equal((await r.json()).data.connected,false);
globalThis.__testUser=null;r=await routes.email.POST(req('POST',{version:p.version,previewHash:p.previewHash}),ctx(t.id));assert.equal(r.status,401);
globalThis.__testUser={userId:'account-a',email:'test@example.invalid'};
assert.throws(()=>routes.mime.mimeRaw('sender@example.invalid',['test@example.invalid'],'Subject\r\nBcc: attacker@example.invalid','body'));
assert.throws(()=>routes.mime.recipients('test@example.invalid\r\nBcc: attacker@example.invalid'));
r=await routes.connection.DELETE(req('DELETE',{}));assert.equal(r.status,200);r=await routes.connection.GET();assert.equal((await r.json()).data.connected,false);
console.log('PASS: OAuth state/cookie/PKCE, encrypted owner-bound tokens, minimal scopes, MIME Unicode, isolated accounts, concurrent send protection, no duplicate sends, explicit retry, uncertain outcome blocking, changed provider detection and disconnect. All Google calls simulated.');db.close();
