import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, test } from 'node:test';
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import type { usePlaybackRate as PlaybackRateHook } from '../src/hooks/usePlaybackRate';

let usePlaybackRate: typeof PlaybackRateHook;
let player: ReturnType<typeof PlaybackRateHook>;
let renderer: ReactTestRenderer | undefined;
let saved: unknown;
let read: () => Promise<unknown>;
let write: (value: unknown) => Promise<void>;
const writes: unknown[] = [];
const trayListeners = new Set<(event: unknown, rate: number) => void>();
let audio: HTMLAudioElement;

before(async () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    electronStore: {
      get: async (key: string) => {
        assert.equal(key, 'playbackRate');
        return read();
      },
      set: async (key: string, value: unknown) => {
        assert.equal(key, 'playbackRate');
        return write(value);
      },
    },
    trayControls: {
      onSetSpeed: (listener: (event: unknown, rate: number) => void) => {
        trayListeners.add(listener);
        return () => { trayListeners.delete(listener); };
      },
    },
  }});
  ({ usePlaybackRate } = await import('../src/hooks/usePlaybackRate'));
});

beforeEach(() => {
  saved = undefined;
  writes.length = 0;
  read = async () => saved;
  write = async (value) => { saved = value; writes.push(value); };
  audio = { playbackRate: 1, defaultPlaybackRate: 1 } as HTMLAudioElement;
});

afterEach(async () => {
  await act(async () => { renderer?.unmount(); });
  renderer = undefined;
  assert.equal(trayListeners.size, 0);
});

async function mount() {
  const audioRef = { current: audio };
  function Player() {
    player = usePlaybackRate(audioRef);
    return null;
  }
  await act(async () => { renderer = create(<Player />); });
}

test('persists a custom choice and restores it after reopening', async () => {
  await mount();
  await act(async () => { player.setRate(1.6); });
  assert.equal(saved, 1.6);
  assert.equal(audio.playbackRate, 1.6);
  await act(async () => { renderer!.unmount(); });
  audio = { playbackRate: 1, defaultPlaybackRate: 1 } as HTMLAudioElement;
  await mount();
  assert.equal(player.playbackRate, 1.6);
  assert.equal(audio.playbackRate, 1.6);
  assert.equal(audio.defaultPlaybackRate, 1.6);
  assert.deepEqual(writes, [1.6]);
});

test('restores web string values and reapplies the preference after a new source loads', async () => {
  saved = '1.75';
  await mount();
  audio.playbackRate = 1;
  await player.applyPlaybackRate();
  assert.equal(player.playbackRate, 1.75);
  assert.equal(audio.playbackRate, 1.75);
});

test('does not overwrite a user choice when an older preference arrives late', async () => {
  let resolve!: (value: unknown) => void;
  read = () => new Promise((done) => { resolve = done; });
  await mount();
  await act(async () => { player.setRate(1.4); });
  await act(async () => { resolve('2'); });
  assert.equal(player.playbackRate, 1.4);
  assert.equal(audio.playbackRate, 1.4);
  assert.equal(saved, 1.4);
});

test('waits for restoration before applying the speed for autoplay', async () => {
  let resolve!: (value: unknown) => void;
  read = () => new Promise((done) => { resolve = done; });
  await mount();
  let applied = false;
  const pending = player.applyPlaybackRate().then(() => { applied = true; });
  await Promise.resolve();
  assert.equal(applied, false);
  await act(async () => { resolve(0.75); await pending; });
  assert.equal(audio.playbackRate, 0.75);
  assert.equal(applied, true);
});

test('ignores invalid stored values and invalid control inputs', async () => {
  for (const value of [null, '', 'invalid', 'Infinity', 0, -1, 3, {}, true]) {
    saved = value;
    await mount();
    assert.equal(player.playbackRate, 1);
    await act(async () => { renderer!.unmount(); });
  }
  await mount();
  await act(async () => {
    for (const rate of [NaN, Infinity, 0, 0.4, 2.1]) player.setRate(rate);
  });
  assert.equal(player.playbackRate, 1);
  assert.deepEqual(writes, []);
});

test('keeps playback usable when preference storage fails', async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    read = async () => { throw new Error('read failed'); };
    write = async () => { throw new Error('write failed'); };
    await mount();
    await act(async () => { player.setRate(1.25); });
    await player.applyPlaybackRate();
    assert.equal(player.playbackRate, 1.25);
    assert.equal(audio.playbackRate, 1.25);
  } finally {
    console.warn = warn;
  }
});

test('persists tray speed changes and removes the listener on unmount', async () => {
  await mount();
  assert.equal(trayListeners.size, 1);
  await act(async () => {
    for (const listener of trayListeners) listener(undefined, 0.5);
  });
  assert.equal(player.playbackRate, 0.5);
  assert.equal(saved, 0.5);
  assert.equal(audio.defaultPlaybackRate, 0.5);
});
