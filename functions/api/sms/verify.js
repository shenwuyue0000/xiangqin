import { SignJWT } from 'jose';

export async function onRequest(context) {
  const { request, env } = context;
  
  try {
    // 解析请求体
    const { phone, userCode } = await request.json();
    
    if (!phone || !userCode) {
      return new Response(JSON.stringify({ error: '参数缺失' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 模拟验证码校验（实际应检查与发送的是否一致）
    if (userCode !== '123456') {
      return new Response(JSON.stringify({ error: '验证码错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 查询或创建用户
    const now = Date.now();
    let user = await env.DB.prepare('SELECT * FROM users WHERE phone = ?').bind(phone).first();
    
    if (!user) {
      await env.DB.prepare('INSERT INTO users (phone, name, registered_at, last_login) VALUES (?, ?, ?, ?)')
        .bind(phone, `手机用户${phone.slice(-4)}`, now, now).run();
    } else {
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
    
    // 设置 Cookie（本地开发建议去除 Secure 标志）
    const headers = new Headers();
    headers.append('Set-Cookie', `token=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
    headers.append('Content-Type', 'application/json');
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}