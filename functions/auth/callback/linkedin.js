import { SignJWT } from 'jose';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
  if (cookies.oauth_state !== state) {
    return new Response('Invalid state parameter', { status: 400 });
  }
  
  if (!code) {
    return new Response('Authorization code missing', { status: 400 });
  }

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${env.FRONTEND_URL}/auth/callback/linkedin`,
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return new Response('Failed to get access token', { status: 500 });
  }

  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const user = await userRes.json();
  
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const jwt = await new SignJWT({
    id: user.sub,
    name: user.name,
    email: user.email || '',
    picture: user.picture || '',
    provider: 'linkedin'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  
  const headers = new Headers();
  headers.append('Set-Cookie', `token=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
  headers.append('Location', env.FRONTEND_URL);
  return new Response(null, { status: 302, headers });
}