export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { phone } = await request.json();
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phone || !phoneRegex.test(phone)) {
    return new Response(JSON.stringify({ error: '手机号格式错误' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 生成6位随机验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // 模拟：将验证码暂存到 D1 的一个临时表中（生产环境建议用 KV，但这里简化为返回码仅用于测试）
  // 为了演示，我们直接把 code 返回给前端（生产环境绝不能这样）
  return new Response(JSON.stringify({ success: true, code }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}