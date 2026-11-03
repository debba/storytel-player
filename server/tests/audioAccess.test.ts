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
let ssoScenario: { refreshStatus: number; audioStatuses: number[] } | undefined;
let refreshRequests = 0;
const audioBearers: unknown[] = [];
const originalAdapter = axios.defaults.adapter;

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'storytel-audio-test-'));
  process.env.USER_DATA_PATH = directory;
  process.env.IS_ELECTRON = 'true';
  process.env.DOWNLOAD_PATH = path.join(directory, 'downloads');
  axios.defaults.adapter = async (config) => {
    if (ssoScenario && config.url?.startsWith('https://securetoken.googleapis.com/')) {
      refreshRequests++;
      const response = {
        status: ssoScenario.refreshStatus, statusText: 'Firebase fixture', headers: {}, config,
        data: { id_token: `fixture-id-token-${refreshRequests}`, expires_in: '3600' },
      };
      if (ssoScenario.refreshStatus === 200) return response;
      throw new AxiosError('Firebase refresh rejected', AxiosError.ERR_BAD_REQUEST, config, undefined, response);
    }
    if (ssoScenario) {
      audioBearers.push(config.headers.Authorization);
      upstreamStatus = ssoScenario.audioStatuses.shift();
    }
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

async function requestSsoStream(scenario: NonNullable<typeof ssoScenario>) {
  ssoScenario = scenario;
  refreshRequests = 0;
  requests = 0;
  audioBearers.length = 0;
  const ssoToken = server.jwt.sign({
    email: 'fixture@example.com',
    ssoStorytelSession: 'fixture-session',
    ssoFirebaseRefreshToken: `fixture-refresh-${scenario.refreshStatus}-${scenario.audioStatuses.join('-')}`,
    ssoFirebaseApiKey: 'fixture-key',
  });
  try {
    return await server.inject({
      method: 'POST', url: '/api/stream',
      headers: { authorization: `Bearer ${ssoToken}` },
      payload: { bookId: '987654321', consumableId: '123456789' },
    });
  } finally {
    ssoScenario = undefined;
  }
}

test('SSO refreshes its ID token and preserves an immediate audio access denial', async () => {
  const response = await requestSsoStream({ refreshStatus: 200, audioStatuses: [403] });
  assert.equal(response.statusCode, 403);
  assert.equal(refreshRequests, 1);
  assert.equal(requests, 1);
  assert.deepEqual(audioBearers, ['Bearer fixture-id-token-1']);
});

test('SSO retries an expired audio token once with the fresh bearer', async () => {
  const response = await requestSsoStream({ refreshStatus: 200, audioStatuses: [401, 302] });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().streamUrl, 'https://example.com/audio.mp3');
  assert.equal(refreshRequests, 2);
  assert.equal(requests, 2);
  assert.deepEqual(audioBearers, ['Bearer fixture-id-token-1', 'Bearer fixture-id-token-2']);
});

for (const status of [403, 429, 500]) {
  test(`SSO preserves a post-refresh ${status} instead of forcing logout`, async () => {
    const response = await requestSsoStream({ refreshStatus: 200, audioStatuses: [401, status] });
    assert.equal(response.statusCode, status);
    assert.equal(refreshRequests, 2);
    assert.equal(requests, 2);
  });
}

test('SSO stops after one retry when the fresh bearer is also rejected', async () => {
  const response = await requestSsoStream({ refreshStatus: 200, audioStatuses: [401, 401] });
  assert.equal(response.statusCode, 401);
  assert.equal(refreshRequests, 2);
  assert.equal(requests, 2);
});

test('SSO treats a rejected Firebase refresh token as an expired session', async () => {
  const response = await requestSsoStream({ refreshStatus: 403, audioStatuses: [] });
  assert.equal(response.statusCode, 401);
  assert.equal(refreshRequests, 1);
  assert.equal(requests, 0);
});
