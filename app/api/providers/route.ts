import { identity,json,failure } from '@/lib/transfers/http';
import { repository } from '@/lib/transfers/repository';
import { providerSchema } from '@/lib/transfers/domain';
export async function GET(){try{const u=await identity();return json({data:await repository.providers(u.userId)});}catch(e){return failure(e);}}
export async function PUT(req:Request){try{const u=await identity(req);return json({data:await repository.saveProvider(u.userId,providerSchema.parse(await req.json()))});}catch(e){return failure(e);}}
