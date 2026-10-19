import { and,eq,desc,sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { transfers,transferEvents,providers } from '@/db/schema';
import { DEFAULT_PROVIDERS,type TransferInput,type TransferStatus,type Transfer,type Provider } from './domain';
export class ConflictError extends Error{}
const scope=(ownerId:string,id:string)=>and(eq(transfers.ownerId,ownerId),eq(transfers.id,id));
function expose(row:typeof transfers.$inferSelect):Transfer{const {ownerId,...rest}=row;return rest as Transfer;}
function duplicate(e:unknown){return String(e).includes('UNIQUE')||String((e as Error).cause).includes('UNIQUE');}
export const repository={
 async list(ownerId:string){return(await getDb().select().from(transfers).where(eq(transfers.ownerId,ownerId)).orderBy(desc(transfers.createdAt))).map(expose);},
 async find(ownerId:string,id:string){const[row]=await getDb().select().from(transfers).where(scope(ownerId,id));return row?expose(row):null;},
 async create(ownerId:string,input:TransferInput){const db=getDb(),id=crypto.randomUUID(),now=new Date().toISOString(),row={...input,id,ownerId,createdAt:now,updatedAt:now,status:'Pendiente',version:1};try{await db.batch([db.insert(transfers).values(row),db.insert(transferEvents).values({id:crypto.randomUUID(),transferId:id,ownerId,action:'Solicitud registrada',createdAt:now})]);}catch(e){if(duplicate(e))throw new ConflictError('Ya existe una solicitud con ese número de reserva. Puedes editarla desde el listado.');throw e;}return expose(row);},
 async update(ownerId:string,id:string,version:number,input:TransferInput,status:TransferStatus){const db=getDb(),now=new Date().toISOString();try{const[rows]=await db.batch([
  db.update(transfers).set({...input,status,version:version+1,updatedAt:now}).where(and(scope(ownerId,id),eq(transfers.version,version))).returning(),
  db.insert(transferEvents).select(db.select({id:sql<string>`${crypto.randomUUID()}`.as('id'),transferId:transfers.id,ownerId:transfers.ownerId,action:sql<string>`${'Solicitud actualizada · '+status}`.as('action'),createdAt:sql<string>`${now}`.as('created_at')}).from(transfers).where(and(scope(ownerId,id),eq(transfers.version,version+1),eq(transfers.updatedAt,now),sql`changes() = 1`)))
 ]);if(!rows.length)throw new ConflictError('La solicitud cambió. Cierra el detalle y vuelve a abrirlo para actualizarla.');return expose(rows[0]);}catch(e){if(duplicate(e))throw new ConflictError('Ese número de reserva ya está registrado.');throw e;}},
 async events(ownerId:string,id:string){return getDb().select({id:transferEvents.id,action:transferEvents.action,createdAt:transferEvents.createdAt}).from(transferEvents).where(and(eq(transferEvents.ownerId,ownerId),eq(transferEvents.transferId,id))).orderBy(desc(transferEvents.createdAt));},
 async providers(ownerId:string):Promise<Provider[]>{const overrides=await getDb().select().from(providers).where(eq(providers.ownerId,ownerId));return DEFAULT_PROVIDERS.map(p=>{const r=overrides.find(x=>x.destination===p.destination);return r?{destination:r.destination,name:r.name,channel:r.channel,contact:r.contact} as Provider:p;});},
 async saveProvider(ownerId:string,p:Provider){await getDb().insert(providers).values({...p,id:crypto.randomUUID(),ownerId}).onConflictDoUpdate({target:[providers.ownerId,providers.destination],set:p});return p;}
};
