import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import storage from '../utils/storage';

// Global playback preference, stored as a number in Electron and a string on the web.
const PLAYBACK_RATE_KEY = 'playbackRate';
const isValidRate = (rate: number): boolean => Number.isFinite(rate) && rate >= 0.5 && rate <= 2;

export function usePlaybackRate(audioRef: RefObject<HTMLAudioElement | null>) {
  const [playbackRate, setPlaybackRate] = useState(1);
  const rateRef = useRef(1);
  const userSelectedRef = useRef(false);
  const restorationRef = useRef<Promise<void> | null>(null);

  const updateRate = useCallback((rate: number) => {
    rateRef.current = rate;
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = rate;
      audioRef.current.playbackRate = rate;
    }
  }, [audioRef]);

  useEffect(() => {
    let cancelled = false;
    restorationRef.current = (async () => {
      try {
        const raw = await storage.get(PLAYBACK_RATE_KEY);
        const rate = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
        if (!cancelled && !userSelectedRef.current && isValidRate(rate)) {
          updateRate(rate);
        }
      } catch (error) {
        console.warn('Failed to restore playback speed:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [updateRate]);

  const setRate = useCallback((rate: number) => {
    if (!isValidRate(rate)) return;
    // A delayed storage read must never replace a newer user choice.
    userSelectedRef.current = true;
    updateRate(rate);
    storage.set(PLAYBACK_RATE_KEY, rate).catch((error) => {
      console.warn('Failed to save playback speed:', error);
    });
  }, [updateRate]);

  useEffect(() => {
    return window.trayControls?.onSetSpeed?.((_event, rate) => setRate(rate));
  }, [setRate]);

  const applyPlaybackRate = useCallback(async () => {
    // Metadata can arrive before Electron has answered the preference read.
    await restorationRef.current;
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = rateRef.current;
      audioRef.current.playbackRate = rateRef.current;
    }
  }, [audioRef]);

  return { playbackRate, setRate, applyPlaybackRate };
}
