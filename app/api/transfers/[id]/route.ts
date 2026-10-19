import { z } from 'zod';
import { identity,json,failure,HttpError } from '@/lib/transfers/http';
import { repository } from '@/lib/transfers/repository';
import { transferInputSchema,STATUSES } from '@/lib/transfers/domain';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Context){try{const u=await identity();const{id}=await ctx.params;const data=await repository.find(u.userId,id);if(!data)throw new HttpError(404,'Solicitud no encontrada.');return json({data,events:await repository.events(u.userId,id)});}catch(e){return failure(e);}}
export async function PATCH(req:Request,ctx:Context){try{const u=await identity(req);const{id}=await ctx.params;const b=z.object({version:z.number().int().positive(),input:transferInputSchema,status:z.enum(STATUSES)}).strict().parse(await req.json());if(!await repository.find(u.userId,id))throw new HttpError(404,'Solicitud no encontrada.');return json({data:await repository.update(u.userId,id,b.version,b.input,b.status)});}catch(e){return failure(e);}}
