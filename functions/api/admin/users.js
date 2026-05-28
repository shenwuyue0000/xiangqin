export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const secretKey = url.searchParams.get('key');
  if (secretKey !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: '未授权' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { results } = await env.DB.prepare('SELECT phone, name, registered_at, last_login FROM users ORDER BY registered_at DESC').all();
  return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' } });
}