import { and,eq,desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { emailDeliveries,transferEvents } from '@/db/schema';
import { repository } from '@/lib/transfers/repository';
import { providerMessage } from '@/lib/transfers/domain';
import { HttpError } from '@/lib/transfers/http';
import { accessToken,connectionStatus } from './oauth';
import { hash } from './crypto';
import { recipients,mimeRaw } from './mime';
export const sendSchema=z.object({version:z.number().int().positive(),previewHash:z.string().min(20).max(100),retry:z.boolean().default(false)}).strict();
const where=(ownerId:string,id:string)=>and(eq(emailDeliveries.ownerId,ownerId),eq(emailDeliveries.id,id));
function exposed(row:typeof emailDeliveries.$inferSelect){return {id:row.id,version:row.version,status:row.status,from:row.sender,to:row.recipients.split(','),messageId:row.messageId,error:row.error,createdAt:row.createdAt,updatedAt:row.updatedAt,attempt:row.attempt};}
export async function preview(ownerId:string,id:string){const t=await repository.find(ownerId,id);if(!t)throw new HttpError(404,'Solicitud no encontrada.');const p=(await repository.providers(ownerId)).find(p=>p.destination===t.destination);const conn=await connectionStatus(ownerId);const history=await getDb().select().from(emailDeliveries).where(and(eq(emailDeliveries.ownerId,ownerId),eq(emailDeliveries.transferId,id))).orderBy(desc(emailDeliveries.createdAt));let to:string[]=[];if(p?.channel==='email'){try{to=recipients(p.contact);}catch{throw new HttpError(422,'Revisa los correos del proveedor antes de enviar.');}}
 const subject='SOLICITUD Y ASIGNACIÓN DE TRASLADOS · '+t.reservation.replace(/[\r\n]/g,' '),text=providerMessage(t),from=conn.email;
 const previewHash=await hash(JSON.stringify({version:t.version,to,from,subject,text}));
 return {version:t.version,previewHash,to,from,subject,text,canSend:conn.configured&&conn.connected&&p?.channel==='email'&&t.status!=='Cancelado',reason:p?.channel!=='email'?'Este destino utiliza WhatsApp.':t.status==='Cancelado'?'La solicitud está cancelada.':!conn.connected?'Conecta Gmail en la sección Conexiones.':null,deliveries:history.map(exposed)};
}
export async function send(ownerId:string,id:string,input:z.infer<typeof sendSchema>){
 const p=await preview(ownerId,id);if(!p.canSend)throw new HttpError(409,p.reason||'Gmail aún no está disponible.');if(p.version!==input.version||p.previewHash!==input.previewHash)throw new HttpError(409,'Los datos o el proveedor cambiaron. Revisa nuevamente el mensaje antes de enviarlo.');
 const db=getDb(),now=new Date().toISOString();let[row]=await db.select().from(emailDeliveries).where(and(eq(emailDeliveries.ownerId,ownerId),eq(emailDeliveries.transferId,id),eq(emailDeliveries.version,p.version)));
 if(row?.status==='sent')return {delivery:exposed(row),alreadySent:true};
 if(row&&row.status!=='failed')throw new HttpError(409,'Hay un envío en curso o con resultado incierto. Revisa Enviados de Gmail antes de tomar otra acción.');
 if(row){if(!input.retry)throw new HttpError(409,'El intento anterior falló. Revisa los datos y confirma Reintentar envío.');const[claimed]=await db.update(emailDeliveries).set({status:'sending',attempt:row.attempt+1,error:null,previewHash:p.previewHash,sender:p.from!,recipients:p.to.join(','),updatedAt:now}).where(and(where(ownerId,row.id),eq(emailDeliveries.status,'failed'),eq(emailDeliveries.attempt,row.attempt))).returning();if(!claimed)throw new HttpError(409,'Otro envío ya está en curso.');row=claimed;}
 else{const[claimed]=await db.insert(emailDeliveries).values({id:crypto.randomUUID(),ownerId,transferId:id,version:p.version,previewHash:p.previewHash,sender:p.from!,recipients:p.to.join(','),status:'sending',attempt:1,createdAt:now,updatedAt:now}).onConflictDoNothing().returning();if(!claimed)throw new HttpError(409,'Este envío ya está siendo procesado.');row=claimed;}
 const deliveryId=row.id;
 async function record(status:string,error:string|null,messageId:string|null=null){const at=new Date().toISOString();const[updated]=await db.batch([db.update(emailDeliveries).set({status,error,messageId,updatedAt:at}).where(where(ownerId,deliveryId)).returning(),db.insert(transferEvents).values({id:crypto.randomUUID(),ownerId,transferId:id,action:status==='sent'?'Correo enviado mediante Gmail · versión '+p.version:status==='uncertain'?'Correo con resultado incierto · revisar Enviados':'Intento de correo fallido',createdAt:at})]);return exposed(updated[0]);}
 let auth:{token:string;email:string};try{auth=await accessToken(ownerId);if(auth.email!==p.from)throw new HttpError(409,'La cuenta remitente cambió. Revisa el mensaje nuevamente.');}catch(e){await record('failed','No fue posible autorizar el envío. Revisa la conexión de Gmail.');throw e;}
 const raw=mimeRaw(auth.email,p.to,p.subject,p.text);
 let response:Response;
 try{response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+auth.token,'Content-Type':'application/json'},body:JSON.stringify({raw}),signal:AbortSignal.timeout(20000)});}catch{const delivery=await record('uncertain','No se pudo confirmar el resultado. Revisa Enviados antes de reenviar.');return {delivery,alreadySent:false};}
 if(!response.ok){const certain=response.status>=400&&response.status<500;const delivery=await record(certain?'failed':'uncertain',certain?`Gmail rechazó el envío (HTTP ${response.status}). Revisa permisos, destinatarios o cuota.`:'Gmail devolvió un error de servidor. Revisa Enviados antes de reenviar.');return {delivery,alreadySent:false};}
 let result:{id?:string}={};try{result=await response.json() as {id?:string};}catch{}
 if(!result.id){return {delivery:await record('uncertain','Gmail no devolvió el identificador. Revisa Enviados antes de reenviar.'),alreadySent:false};}
 return {delivery:await record('sent',null,result.id),alreadySent:false};
}
