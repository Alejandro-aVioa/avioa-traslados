import { identity,json,failure } from '@/lib/transfers/http';
import { startOAuth } from '@/lib/gmail/oauth';
export async function GET(){try{const u=await identity();const s=await startOAuth(u.userId);return new Response(null,{status:302,headers:{Location:s.url,'Set-Cookie':`__Host-gmail_oauth=${s.nonce}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch(e){return failure(e);}}
