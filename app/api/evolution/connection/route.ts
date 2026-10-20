import { identity,json,failure } from '@/lib/transfers/http';
import { connectionStatus } from '@/lib/evolution/service';
export async function GET(){try{await identity();return json({data:await connectionStatus()});}catch(e){return failure(e);}}
