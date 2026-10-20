import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { and,eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { gmailTestDeliveries } from '@/db/schema';
import { accessToken } from '@/lib/gmail/oauth';
import { hash } from '@/lib/gmail/crypto';
import { mimeRaw } from '@/lib/gmail/mime';
import { HttpError,json,failure } from '@/lib/transfers/http';
// Owner-private service diagnostic. It never accepts recipient or message overrides.
// A short-lived server approval binds one execution to the owner's explicit request.
const approvalSchema=z.object({id:z.string().uuid(),ownerId:z.string().min(1),sender:z.string().email(),to:z.string().email(),subject:z.string().min(1).max(160).refine(s=>!/[\r\n]/.test(s)),text:z.string().min(1).max(2000),tokenHash:z.string().length(43),issuedAt:z.number(),expiresAt:z.number()}).strict();
export async function POST(req:Request){try{
 if(!env.GMAIL_TEST_APPROVAL)throw new HttpError(403,'No hay una prueba autorizada.');
 let approval:ReturnType<typeof approvalSchema.parse>;
 try{approval=approvalSchema.parse(JSON.parse(env.GMAIL_TEST_APPROVAL));}catch{throw new HttpError(403,'La autorización de prueba no es válida.');}
 const nowMs=Date.now();if(approval.issuedAt>nowMs||approval.expiresAt<=nowMs||approval.expiresAt-approval.issuedAt>900000)throw new HttpError(403,'La autorización de prueba venció.');
 const token=req.headers.get('x-avioa-test-approval')||'';if(token.length<32||await hash(token)!==approval.tokenHash)throw new HttpError(403,'Prueba no autorizada.');
 // Body must be empty so the approved message cannot be altered by the caller.
 if((await req.text()).trim())throw new HttpError(400,'La prueba no acepta un cuerpo de solicitud.');
 const db=getDb(),scope=and(eq(gmailTestDeliveries.id,approval.id),eq(gmailTestDeliveries.ownerId,approval.ownerId));
 const existing=await db.select().from(gmailTestDeliveries).where(scope);if(existing[0])return json({data:{status:existing[0].status,messageId:existing[0].messageId,alreadyProcessed:true}});
 const now=new Date().toISOString();const[claimed]=await db.insert(gmailTestDeliveries).values({id:approval.id,ownerId:approval.ownerId,sender:approval.sender,recipient:approval.to,subject:approval.subject,status:'sending',createdAt:now,updatedAt:now}).onConflictDoNothing().returning();if(!claimed)throw new HttpError(409,'La prueba ya está en curso.');
 const record=async(status:string,messageId:string|null=null)=>{await db.update(gmailTestDeliveries).set({status,messageId,updatedAt:new Date().toISOString()}).where(scope);return json({data:{status,messageId,from:approval.sender,to:approval.to}});};
 let auth:{token:string;email:string};try{auth=await accessToken(approval.ownerId);}catch(e){await record('failed');throw e;}
 if(auth.email!==approval.sender){await record('failed');throw new HttpError(409,'La cuenta remitente cambió; se necesita una nueva autorización.');}
 if(Date.now()>=approval.expiresAt){await record('failed');throw new HttpError(403,'La autorización venció antes de enviar.');}
 const raw=mimeRaw(auth.email,[approval.to],approval.subject,approval.text);
 let r:Response;try{r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+auth.token,'Content-Type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(20000)});}catch{return record('uncertain');}
 if(!r.ok)return record(r.status>=400&&r.status<500?'failed':'uncertain');
 let result:{id?:string}={};try{result=await r.json() as {id?:string};}catch{}
 return result.id?record('sent',result.id):record('uncertain');
 }catch(e){return failure(e);}}
