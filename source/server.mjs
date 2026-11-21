import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { source } from './source.mjs';

const scenarios = JSON.parse(readFileSync(new URL('./scenarios.json', import.meta.url), 'utf8'));
const dataRoot = new URL('./media/', import.meta.url);

export function createSource(scenario = 'main') {
  if (!Object.hasOwn(scenarios, scenario)) throw new Error('未知的演练场景');
  const timeline = scenarios[scenario];
  let step = 0;
  const memory = new Map();

  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (status, content, headers = {}) => {
      res.writeHead(status, headers);
      res.end(content);
    };
    const json = (status, content, headers = {}) =>
      send(status, JSON.stringify(content), { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    let payload;
    const body = async () => {
      if (!payload) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        payload = Buffer.concat(chunks).toString('utf8');
      }
      return req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')
        ? Object.fromEntries(new URLSearchParams(payload))
        : JSON.parse(payload || '{}');
    };
    const html = (status, content) => send(status,
      '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>来源工作台</title><body>' +
      content + '</body></html>', { 'Content-Type': 'text/html; charset=utf-8' });
    try {
      if (url.pathname === '/clock') {
        if (req.method === 'POST') {
          const input = await body();
          if (!Number.isInteger(input.step) || input.step < step || input.step >= timeline.length) {
            return json(400, { error: '时钟只能前进到场景中存在的刻度' });
          }
          step = input.step;
        }
        return json(200, { step, tick: timeline[step].tick });
      }
      if (req.method === 'GET' && Object.hasOwn(timeline[step].feeds, url.pathname)) {
        const reply = timeline[step].feeds[url.pathname];
        return json(reply.status ?? 200, reply.data, reply.headers);
      }
      if (!await source({ req, res, url, step, frame: timeline[step], memory, body, send, json, html,
        media: name => {
          if (!/^[a-zA-Z0-9._-]+$/.test(name) || name === '.' || name === '..') {
            throw new Error('原件名称无效');
          }
          return readFileSync(new URL(name, dataRoot));
        },
      }) && !res.headersSent) {
        return json(404, { error: '来源没有这项资料' });
      }
    } catch {
      if (!res.headersSent) json(400, { error: '请求格式无效' });
      else res.destroy();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createSource(process.env.SCENARIO || 'main').listen(Number(process.env.PORT || 4180), '127.0.0.1', function () {
    console.log('演练来源已监听本机端口', this.address().port);
  });
}
