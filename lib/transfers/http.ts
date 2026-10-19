import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ZodError } from 'zod';
import { ConflictError } from './repository';
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export async function identity(req?:Request){const u=await getChatGPTUser();if(!u)throw new HttpError(401,'Inicia sesión para acceder a tus solicitudes.');if(req&&!['GET','HEAD'].includes(req.method)){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new HttpError(403,'Origen no autorizado.');}return u;}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});}
export function failure(e:unknown){if(e instanceof ZodError)return json({message:'Revisa los datos de la solicitud.',errors:e.flatten()},422);if(e instanceof HttpError)return json({message:e.message},e.status);if(e instanceof ConflictError)return json({message:e.message},409);if(e instanceof SyntaxError)return json({message:'El cuerpo JSON no es válido.'},400);console.error('transfers_api_error',e instanceof Error?e.message:'Unknown error');return json({message:'No fue posible completar la operación. Intenta nuevamente.'},500);}
