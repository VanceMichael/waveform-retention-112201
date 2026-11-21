export async function exercise({request, move, data, post, assert}) {
  const issue = { line:'L1', boot:'b', first:0, last:4 };
  const replies = [await post('/tickets',issue), await post('/tickets',issue)];
  assert.deepEqual(replies.map(r => r.status), [201,201]);
  const {id} = await replies[0].json();
  const portion = await request('/tickets/'+id);
  assert.equal(portion.headers.get('x-sequence-until'),'2');
  assert.match(await portion.text(), /"boot":"b"/);
  assert.equal((await post('/tickets',issue)).status,429);
  await move(1);
  assert.equal((await data('/quality')).runs[1].station,'L2');
  await move(2);
  assert.equal((await request('/tickets/'+id)).status,410);
  assert.equal((await post('/tickets',issue)).status,410);
}
