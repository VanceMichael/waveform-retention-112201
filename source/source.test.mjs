import test from 'node:test';
import assert from 'node:assert/strict';
import { createSource } from './server.mjs';
import { exercise } from './source-check.mjs';

test('本地来源按接口回放原始资料', async () => {
  const server = createSource();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (path, options) => fetch(base + path, options);
  const move = async step => {
    const result = await request('/clock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step }),
    });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).step, step);
  };
  const data = async path => {
    const response = await request(path);
    assert.equal(response.status, 200);
    return response.json();
  };
  const post = (path, input) => request(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  try {
    assert.equal((await data('/clock')).step, 0);
    await exercise({ base, request, move, data, post, assert });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
