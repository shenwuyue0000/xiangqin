export async function onRequest() {
  const headers = new Headers();
  headers.append('Set-Cookie', 'token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  headers.append('Location', '/');
  return new Response(null, { status: 302, headers });
}