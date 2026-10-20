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

declare namespace Cloudflare { interface Env { GMAIL_TEST_APPROVAL?: string; } }

declare namespace Cloudflare { interface Env { EVOLUTION_BASE_URL?: string; EVOLUTION_INSTANCE?: string; EVOLUTION_API_KEY?: string; } }
