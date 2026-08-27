export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const data = await request.json();
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const report = {
      type: data.type || 'error',
      id,
      timestamp: new Date().toISOString(),
      source: (data.source || '').slice(0, 500),
      line: data.line,
      col: data.col,
      userAgent: request.headers.get('user-agent'),
      page: data.page || '',
      message: (data.message || '').slice(0, 1000),
    };
    await env.BUG_REPORTS.put(id, JSON.stringify(report), { expirationTtl: 60 * 60 * 24 * 30 }); // 30 days
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
}
