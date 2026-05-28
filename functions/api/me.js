import { jwtVerify } from 'jose';

export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
    const token = cookies.token;
    
    if (!token) {
      return new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    const responseData = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      provider: payload.provider,
      providerIcon: payload.provider === 'facebook' ? 'fab fa-facebook' : (payload.provider === 'linkedin' ? 'fab fa-linkedin' : 'fas fa-mobile-alt')
    };
    
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}