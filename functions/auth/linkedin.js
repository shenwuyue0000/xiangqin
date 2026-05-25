export async function onRequest(context) {
  const { env } = context;
  const clientId = env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${env.FRONTEND_URL}/auth/callback/linkedin`;
  const scope = 'openid profile email';
  const state = Math.random().toString(36).substring(2, 15);
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  
  const headers = new Headers();
  headers.append('Location', authUrl);
  headers.append('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  return new Response(null, { status: 302, headers });
}