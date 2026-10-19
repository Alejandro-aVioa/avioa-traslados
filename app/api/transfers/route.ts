import { identity,json,failure } from '@/lib/transfers/http';
import { repository } from '@/lib/transfers/repository';
import { transferInputSchema } from '@/lib/transfers/domain';
export async function GET(){try{const u=await identity();return json({data:await repository.list(u.userId)});}catch(e){return failure(e);}}
export async function POST(req:Request){try{const u=await identity(req);return json({data:await repository.create(u.userId,transferInputSchema.parse(await req.json()))},201);}catch(e){return failure(e);}}
