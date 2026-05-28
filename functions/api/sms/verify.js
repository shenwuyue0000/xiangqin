import { SignJWT } from 'jose';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { phone, userCode } = await request.json();
  if (!phone || !userCode) {
    return new Response(JSON.stringify({ error: '参数缺失' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 模拟验证：这里简单判断输入的验证码是否为 "123456"
  // 实际应从存储（如 D1 临时表）中读取与 phone 对应的验证码进行比较
  if (userCode !== '123456') {
    return new Response(JSON.stringify({ error: '验证码错误' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const now = Date.now();

  // 查询用户是否已存在
  let user = await env.DB.prepare('SELECT * FROM users WHERE phone = ?').bind(phone).first();

  if (!user) {
    // 新用户：插入
    await env.DB.prepare('INSERT INTO users (phone, name, registered_at, last_login) VALUES (?, ?, ?, ?)')
      .bind(phone, `手机用户${phone.slice(-4)}`, now, now)
      .run();
  } else {
    // 更新最后登录时间
    await env.DB.prepare('UPDATE users SET last_login = ? WHERE phone = ?').bind(now, phone).run();
  }

  // 生成 JWT
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const jwt = await new SignJWT({
    id: phone,
    name: `手机用户${phone.slice(-4)}`,
    email: `${phone}@phone.local`,
    provider: 'phone'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  // 设置 httpOnly Cookie
  const headers = new Headers();
  headers.append('Set-Cookie', `token=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
  headers.append('Content-Type', 'application/json');
  return new Response(JSON.stringify({ success: true, user: { phone, name: `手机用户${phone.slice(-4)}` } }), {
    status: 200,
    headers
  });
}