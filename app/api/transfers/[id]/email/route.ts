import { identity,json,failure } from '@/lib/transfers/http';
import { preview,send,sendSchema } from '@/lib/gmail/delivery';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Context){try{const u=await identity();const{id}=await ctx.params;return json({data:await preview(u.userId,id)});}catch(e){return failure(e);}}
export async function POST(req:Request,ctx:Context){try{const u=await identity(req);const{id}=await ctx.params;return json({data:await send(u.userId,id,sendSchema.parse(await req.json()))});}catch(e){return failure(e);}}
