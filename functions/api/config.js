/**
 * Cloudflare Pages Function: /api/config
 * Serves Firebase config from environment variables.
 * 
 * Set these in Cloudflare Dashboard → Pages → Settings → Environment Variables:
 *   FIREBASE_API_KEY
 *   FIREBASE_AUTH_DOMAIN
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_STORAGE_BUCKET
 *   FIREBASE_MESSAGING_SENDER_ID
 *   FIREBASE_APP_ID
 *   FIREBASE_DATABASE_URL
 */
export function onRequestGet(context) {
  const env = context.env;

  const config = {
    apiKey:            env.FIREBASE_API_KEY            || "",
    authDomain:        env.FIREBASE_AUTH_DOMAIN         || "",
    projectId:         env.FIREBASE_PROJECT_ID          || "",
    storageBucket:     env.FIREBASE_STORAGE_BUCKET      || "",
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId:             env.FIREBASE_APP_ID              || "",
    databaseURL:       env.FIREBASE_DATABASE_URL        || ""
  };

  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600"  // Cache 1 hour
    }
  });
}