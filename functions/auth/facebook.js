export async function onRequest(context) {
  const { env } = context;
  const clientId = env.FACEBOOK_APP_ID;
  const redirectUri = `${env.FRONTEND_URL}/auth/callback/facebook`;
  const scope = 'email,public_profile';
  const state = Math.random().toString(36).substring(2, 15);
  const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  
  const headers = new Headers();
  headers.append('Location', authUrl);
  headers.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  return new Response(null, { status: 302, headers });
}