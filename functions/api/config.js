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
 *   FIREBASE_MEASUREMENT_ID  (optional)
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
    databaseURL:       env.FIREBASE_DATABASE_URL        || "",
    measurementId:     env.FIREBASE_MEASUREMENT_ID      || ""
  };

  // Don't serve empty config — return 500 if API key is missing
  if (!config.apiKey) {
    return new Response(JSON.stringify({ error: "Firebase config not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600"
    }
  });
}