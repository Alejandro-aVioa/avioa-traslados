import { identity,json,failure } from '@/lib/transfers/http';
import { connectionStatus,disconnect } from '@/lib/gmail/oauth';
export async function GET(){try{const u=await identity();return json({data:await connectionStatus(u.userId)});}catch(e){return failure(e);}}
export async function DELETE(req:Request){try{const u=await identity(req);await disconnect(u.userId);return json({data:{disconnected:true}});}catch(e){return failure(e);}}
