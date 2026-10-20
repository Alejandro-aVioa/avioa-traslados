import { identity,json,failure } from '@/lib/transfers/http';
import { preview,send,sendSchema } from '@/lib/evolution/delivery';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Context){try{const u=await identity();return json({data:await preview(u.userId,(await ctx.params).id)});}catch(e){return failure(e);}}
export async function POST(req:Request,ctx:Context){try{const u=await identity(req);return json({data:await send(u.userId,(await ctx.params).id,sendSchema.parse(await req.json()))});}catch(e){return failure(e);}}
