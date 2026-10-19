declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}

declare namespace Cloudflare {
 interface Env {
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_TOKEN_ENCRYPTION_KEY?: string;
  GMAIL_REDIRECT_URI?: string;
 }
}
