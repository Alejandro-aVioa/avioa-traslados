import { env } from 'cloudflare:workers';
import { HttpError } from '@/lib/transfers/http';
export const SEND_SCOPE='https://www.googleapis.com/auth/gmail.send';
export function config(){return {clientId:env.GMAIL_CLIENT_ID||'',clientSecret:env.GMAIL_CLIENT_SECRET||'',encryptionKey:env.GMAIL_TOKEN_ENCRYPTION_KEY||'',redirectUri:env.GMAIL_REDIRECT_URI||''};}
export function configured(){const c=config();return !!(c.clientId&&c.clientSecret&&c.encryptionKey&&c.redirectUri);}
export function requireConfig(){const c=config();if(!configured())throw new HttpError(503,'La conexión de Gmail está pendiente de configuración.');const u=new URL(c.redirectUri);if(u.protocol!=='https:'||u.pathname!=='/api/gmail/callback')throw new HttpError(503,'La dirección de retorno de Gmail no es válida.');return c;}
