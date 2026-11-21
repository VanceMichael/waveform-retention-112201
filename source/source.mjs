export async function source({req,url,frame,memory,body,json,send}) {
  const pathname = url.pathname;
  const tick = frame.tick;
  if (pathname === '/tickets' && req.method === 'POST') {
    const {line,boot,first,last} = await body();
    const trigger = frame.feeds['/triggers'].data.find(item => item.line === line && item.boot === boot
      && item.sequence[0] <= first && item.sequence[1] >= last);
    if (!trigger || !Number.isInteger(first) || !Number.isInteger(last) || last <= first) {
      return json(416, { error: '区间不在控制器记录内' });
    }
    if (trigger.expires <= tick) return json(410, { error: '块已过保留期' });
    const active = [...memory.values()].filter(ticket => ticket.expires > tick);
    if (active.length >= 2) return json(429, { error: '票据位已满' });
    const id = 'hold-' + (memory.size + 1);
    const ticket = { id, line, boot, first, last: Math.min(last, first + 4), expires: Math.min(tick + 8, trigger.expires) };
    memory.set(id, ticket);
    return json(201, ticket);
  }
  if (!pathname.startsWith('/tickets/')) return false;
  const ticket = memory.get(pathname.split('/').at(-1));
  if (!ticket || ticket.expires <= tick) return json(410, { error: '票据失效' });
  if (req.method === 'DELETE') {
    ticket.expires = tick;
    return send(204);
  }
  const first = Number(url.searchParams.get('first') ?? ticket.first);
  const last = Number(url.searchParams.get('last') ?? ticket.last);
  if (first < ticket.first || last > ticket.last || last <= first || !Number.isInteger(first) || !Number.isInteger(last)) {
    return json(416, { error: '读取范围不在票据内' });
  }
  const until = Math.min(last, first + frame.chunkLimit);
  const points = Array.from({ length: until - first }, (_, i) => JSON.stringify({
    line: ticket.line, boot: ticket.boot, sequence: first + i, pressure: 70 + i + ticket.boot.charCodeAt(0),
  }));
  return send(200, points.join('\n') + '\n', {
    'Content-Type': 'application/x-ndjson', 'X-Sequence-Until': String(until),
  });
}
