import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import axios, { AxiosError } from 'axios';
import type { FastifyInstance } from 'fastify';

let server: FastifyInstance;
let directory: string;
let token: string;
let upstreamStatus: number | undefined = 403;
let requests = 0;
const originalAdapter = axios.defaults.adapter;

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'storytel-audio-test-'));
  process.env.USER_DATA_PATH = directory;
  process.env.IS_ELECTRON = 'true';
  process.env.DOWNLOAD_PATH = path.join(directory, 'downloads');
  axios.defaults.adapter = async (config) => {
    requests++;
    const response = {
      status: upstreamStatus ?? 0,
      statusText: 'Fixture response',
      headers: upstreamStatus === 302 ? { location: 'https://example.com/audio.mp3' } : {},
      config,
      data: { message: 'Forbidden' },
      request: { res: {} },
    };
    if (upstreamStatus === 302) return response;
    throw new AxiosError(
      upstreamStatus ? `Request failed with status code ${upstreamStatus}` : 'Network error',
      AxiosError.ERR_BAD_REQUEST, config, undefined,
      upstreamStatus ? response : undefined,
    );
  };
  server = (await import('../fastify-common')).default;
  await server.ready();
  token = server.jwt.sign({ email: 'fixture@example.com', jwt: 'fixture-bearer', storytelToken: 'fixture-session' });
});

after(async () => {
  await server?.close();
  // Allow the logger's deferred writes to finish before removing its temporary directory.
  await new Promise<void>((resolve) => setImmediate(resolve));
  axios.defaults.adapter = originalAdapter;
  await rm(directory, { recursive: true, force: true });
});

for (const route of ['/api/stream', '/api/download']) {
  for (const modern of [true, false]) {
    test(`${route} preserves a 403 from the ${modern ? 'assets' : 'legacy'} endpoint without retrying`, async () => {
      upstreamStatus = 403;
      requests = 0;
      const response = await server.inject({
        method: 'POST', url: route,
        headers: { authorization: `Bearer ${token}` },
        payload: { bookId: '987654321', ...(modern ? { consumableId: '123456789' } : {}) },
      });
      assert.equal(response.statusCode, 403);
      assert.match(response.json().error, /403/);
      assert.equal(requests, 1);
    });
  }
}

test('preserves session expiry as 401 and network failures as 500', async () => {
  for (const [status, expected] of [[401, 401], [undefined, 500]] as const) {
    upstreamStatus = status;
    const response = await server.inject({
      method: 'POST', url: '/api/stream',
      headers: { authorization: `Bearer ${token}` },
      payload: { bookId: '987654321', consumableId: '123456789' },
    });
    assert.equal(response.statusCode, expected);
  }
});

test('still returns the audio URL from a successful redirect', async () => {
  upstreamStatus = 302;
  const response = await server.inject({
    method: 'POST', url: '/api/stream',
    headers: { authorization: `Bearer ${token}` },
    payload: { bookId: '987654321', consumableId: '123456789' },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().streamUrl, 'https://example.com/audio.mp3');
});
