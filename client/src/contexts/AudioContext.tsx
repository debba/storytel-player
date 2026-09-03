import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import api, { trackAction } from '../utils/api';
import storage from '../utils/storage';
import { BookShelfEntity, BookMetaData } from '../interfaces/books';
import { Chapter } from '../interfaces/chapters';
import { BookmarkPositional } from '../interfaces/bookmarks';
import { extractChaptersFromResponse, generateAudioTracks } from '../utils/chapters';

interface LocalPosition {
  position: number;
  updatedAt: string;
}

const positionStorageKey = (consumableId: string) => `pos:${consumableId}`;

const readLocalPosition = async (consumableId: string): Promise<LocalPosition | null> => {
  try {
    const raw = await storage.get(positionStorageKey(consumableId));
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof parsed?.position === 'number' && typeof parsed?.updatedAt === 'string') {
      return parsed as LocalPosition;
    }
    return null;
  } catch {
    return null;
  }
};

const writeLocalPosition = async (consumableId: string, position: number) => {
  try {
    const payload: LocalPosition = {
      position,
      updatedAt: new Date().toISOString(),
    };
    await storage.set(positionStorageKey(consumableId), JSON.stringify(payload));
  } catch {
    // best-effort cache; ignore failures
  }
};

export interface CurrentChapterInfo {
  number: number;
  title: string;
  start: number;
  end: number;
  durationInSeconds?: number;
}

export interface AudioContextType {
  activeBook: BookShelfEntity | null;
  activeBookId: string | null;
  activeConsumableId: string | null;
  audioSrc: string | null;
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  chapters: Chapter[];
  currentChapter: CurrentChapterInfo | null;
  loadBook: (book: BookShelfEntity | null, bookId: string, autoPlay?: boolean) => Promise<void>;
  togglePlayPause: () => void;
  seek: (seekTime: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setRate: (rate: number) => void;
  cyclePlaybackRate: () => void;
  setVolume: (newVolume: number) => void;
  toggleMute: () => void;
  jumpToChapter: (startTime: number) => void;
  sleepTimerRemaining: number | null;
  sleepTimerMode: number | 'chapter' | null;
  setSleepTimer: (option: number | 'chapter' | null) => void;
  error: string | null;
  setError: (err: string | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const PLAYBACK_RATES = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const positionUpdateIntervalRef = useRef<any>(null);
  const sleepTimerIntervalRef = useRef<any>(null);

  const [activeBook, setActiveBook] = useState<BookShelfEntity | null>(null);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeConsumableId, setActiveConsumableId] = useState<string | null>(null);

  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolumeState] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1.0);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [sleepTimerMode, setSleepTimerMode] = useState<number | 'chapter' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `loadBook` is handed to components that list it in effect dependencies, so
  // it has to keep a stable identity across renders. It therefore reads the live
  // playback state through these mirrors instead of closing over the state.
  const activeBookIdRef = useRef<string | null>(null);
  const activeConsumableIdRef = useRef<string | null>(null);
  const audioSrcRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  // Discards a slow /stream response once a newer book has taken over.
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    activeBookIdRef.current = activeBookId;
    activeConsumableIdRef.current = activeConsumableId;
    audioSrcRef.current = audioSrc;
    isPlayingRef.current = isPlaying;
  });

  // Position synchronization helper
  const updatePosition = useCallback(async () => {
    if (!audioRef.current || !activeConsumableId) return;

    const position = Math.floor(audioRef.current.currentTime * 1000);
    // Always persist locally first so offline listening is preserved
    await writeLocalPosition(activeConsumableId, position);

    try {
      await api.put(`/bookmark-positional/${activeConsumableId}`, { position });
    } catch (err) {
      console.warn('Failed to sync position to API, kept locally', err);
    }
  }, [activeConsumableId]);

  // Read remote/local saved position and jump
  const goToPosition = useCallback(async (consumableId: string) => {
    let remote: { position: number; updatedAt: string | null } | null = null;
    try {
      const response = await api.get<BookmarkPositional[]>(`/bookmark-positional/${consumableId}`);
      const entry = response.data?.find((format) => format.type === 'abook');
      if (entry) {
        remote = {
          position: entry.position || 0,
          updatedAt: entry.updatedTime || null,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch remote position, will use local cache', err);
    }

    const local = await readLocalPosition(consumableId);
    let chosenPosition = 0;
    if (remote && local) {
      const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
      const localTime = Date.parse(local.updatedAt);
      chosenPosition = localTime > remoteTime ? local.position : remote.position;
    } else if (remote) {
      chosenPosition = remote.position;
    } else if (local) {
      chosenPosition = local.position;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = Math.floor(chosenPosition / 1000);
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  // Load chapters for active book
  const loadChapters = useCallback(async (consumableId: string, knownDurationSeconds?: number) => {
    if (!consumableId) return;
    try {
      const response = await api.get(`/bookmetadata/${consumableId}`);
      const list = extractChaptersFromResponse(response.data);
      if (list.length > 0) {
        setChapters(list);
        return;
      }
    } catch (err) {
      console.warn('Failed to load chapters from /bookmetadata:', err);
    }

    try {
      const details = await api.get(`/book-details/${consumableId}`);
      const list = extractChaptersFromResponse(details.data);
      if (list.length > 0) {
        setChapters(list);
        return;
      }
    } catch (err) {
      console.warn('Failed to load chapters from /book-details:', err);
    }

    // Fallback: If duration is known, generate structured audio tracks ("Ljudspår")
    const durationSec =
      knownDurationSeconds ||
      (audioRef.current?.duration && !isNaN(audioRef.current.duration) ? audioRef.current.duration : 0);
    if (durationSec > 0) {
      setChapters(generateAudioTracks(durationSec));
    } else {
      setChapters([]);
    }
  }, []);

  // Compute current chapter from chapters list and currentTime
  const currentChapter = useMemo<CurrentChapterInfo | null>(() => {
    if (!chapters || chapters.length === 0) return null;

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      if (currentTime >= chapter.start && currentTime < chapter.end) {
        return {
          number: chapter.number ?? (i + 1),
          title: chapter.title || `Kapitel ${chapter.number ?? (i + 1)}`,
          start: chapter.start,
          end: chapter.end,
          durationInSeconds: chapter.durationInSeconds,
        };
      }
    }

    const last = chapters[chapters.length - 1];
    if (currentTime >= last.start) {
      return {
        number: last.number ?? chapters.length,
        title: last.title || `Kapitel ${last.number ?? chapters.length}`,
        start: last.start,
        end: last.end,
        durationInSeconds: last.durationInSeconds,
      };
    }

    return null;
  }, [chapters, currentTime]);

  const jumpToChapter = useCallback(
    (startTime: number) => {
      if (audioRef.current && typeof startTime === 'number' && !isNaN(startTime)) {
        audioRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }
    },
    []
  );

  // Sleep timer implementation
  const setSleepTimer = useCallback((option: number | 'chapter' | null) => {
    if (sleepTimerIntervalRef.current) {
      clearInterval(sleepTimerIntervalRef.current);
      sleepTimerIntervalRef.current = null;
    }
    setSleepTimerMode(option);

    if (option === null) {
      setSleepTimerRemaining(null);
      return;
    }

    if (typeof option === 'number') {
      const totalSeconds = option * 60;
      setSleepTimerRemaining(totalSeconds);

      sleepTimerIntervalRef.current = setInterval(() => {
        setSleepTimerRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(sleepTimerIntervalRef.current);
            sleepTimerIntervalRef.current = null;
            if (audioRef.current) {
              audioRef.current.pause();
            }
            setSleepTimerMode(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (option === 'chapter') {
      setSleepTimerRemaining(null);
    }
  }, []);

  const shouldAutoPlayRef = useRef<boolean>(true);

  // Main book loader
  const loadBook = useCallback(
    async (book: BookShelfEntity | null, bookId: string, autoPlay: boolean = true) => {
      const isMatchingBook =
        book &&
        (String(book.id) === String(bookId) ||
         String(book.abook?.id) === String(bookId) ||
         String(book.book?.consumableId) === String(bookId));
      const validBook = isMatchingBook ? book : null;
      const consumableId = validBook?.book?.consumableId || bookId;
      shouldAutoPlayRef.current = autoPlay;

      // If this book is already active and stream is loaded, don't restart
      if (activeBookIdRef.current === bookId && audioSrcRef.current) {
        if (validBook) setActiveBook(validBook);
        if (autoPlay && audioRef.current && !isPlayingRef.current) {
          audioRef.current.play().catch(console.error);
        }
        return;
      }

      // If switching from a previous book, flush its position bookmark immediately
      const prevCid = activeConsumableIdRef.current;
      if (prevCid && prevCid !== consumableId && audioRef.current) {
        const prevPosition = Math.floor(audioRef.current.currentTime * 1000);
        if (prevPosition > 0) {
          writeLocalPosition(prevCid, prevPosition);
          api.put(`/bookmark-positional/${prevCid}`, { position: prevPosition }).catch((err) => {
            console.warn('Failed to sync previous book bookmark position:', err);
          });
        }
      }

      // Stop and completely tear down the previous audio element stream
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      if (positionUpdateIntervalRef.current) {
        clearInterval(positionUpdateIntervalRef.current);
        positionUpdateIntervalRef.current = null;
      }

      isPlayingRef.current = false;
      audioSrcRef.current = null;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setAudioSrc(null);

      // Persist session to local storage for quick restore
      storage
        .set(
          'last_played_session',
          JSON.stringify({ book: validBook, bookId, consumableId })
        )
        .catch(() => {});

      const knownDurationSec = validBook?.abook?.time ? validBook.abook.time / 1000000 : 0;
      loadChapters(consumableId, knownDurationSec);

      const requestId = ++loadRequestIdRef.current;

      try {
        setIsLoading(true);
        setError(null);
        setActiveBook(validBook);
        activeBookIdRef.current = bookId;
        activeConsumableIdRef.current = consumableId;
        setActiveBookId(bookId);
        setActiveConsumableId(consumableId);

        const response = await api.post('/stream', { bookId, consumableId });
        // A newer loadBook call took over while this stream was being resolved
        if (requestId !== loadRequestIdRef.current) return;

        const streamUrl = response.data.streamUrl;
        audioSrcRef.current = streamUrl;
        setAudioSrc(streamUrl);

        if (audioRef.current) {
          audioRef.current.src = streamUrl;
          audioRef.current.load();
        }
      } catch (err: any) {
        if (requestId !== loadRequestIdRef.current) return;
        console.error('Failed to load audio stream:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load audio');
        setIsLoading(false);
      }
    },
    [loadChapters]
  );

  // Restore previous session on launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = await storage.get('last_played_session');
        if (!raw) return;
        const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (saved?.bookId && !activeBookIdRef.current) {
          setActiveBook(saved.book || null);
          activeBookIdRef.current = saved.bookId;
          setActiveBookId(saved.bookId);
          const cid = saved.consumableId || saved.bookId;
          activeConsumableIdRef.current = cid;
          setActiveConsumableId(cid);
          const savedDurationSec = saved.book?.abook?.time ? saved.book.abook.time / 1000000 : 0;
          if (savedDurationSec > 0) {
            setDuration(savedDurationSec);
          }
          loadChapters(cid, savedDurationSec);
          if (cid) {
            const local = await readLocalPosition(cid);
            if (local) {
              setCurrentTime(Math.floor(local.position / 1000));
            }
          }
        }
      } catch (err) {
        console.warn('Failed to restore last played session:', err);
      }
    };
    restoreSession();
  }, [loadChapters]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioSrc && activeBookId) {
      loadBook(activeBook, activeBookId, true);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [isPlaying, audioSrc, activeBookId, activeBook, loadBook]);

  const seek = useCallback((seekTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, []);

  const skipForward = useCallback(
    (seconds: number = 30) => {
      if (audioRef.current) {
        const nextTime = Math.min(audioRef.current.currentTime + seconds, duration || audioRef.current.duration || Infinity);
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        trackAction('skip_forward', { bookId: activeBookId, consumableId: activeConsumableId, seconds });
      }
    },
    [duration, activeBookId, activeConsumableId]
  );

  const skipBackward = useCallback(
    (seconds: number = 15) => {
      if (audioRef.current) {
        const nextTime = Math.max(audioRef.current.currentTime - seconds, 0);
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        trackAction('skip_backward', { bookId: activeBookId, consumableId: activeConsumableId, seconds });
      }
    },
    [activeBookId, activeConsumableId]
  );

  const setRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length] || 1.0;
    setRate(nextRate);
  }, [playbackRate, setRate]);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = previousVolume;
      setVolumeState(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      audioRef.current.volume = 0;
      setVolumeState(0);
      setIsMuted(true);
    }
  }, [isMuted, previousVolume, volume]);

  // Audio element listeners
  const onPlay = () => {
    setIsPlaying(true);
    if (positionUpdateIntervalRef.current) clearInterval(positionUpdateIntervalRef.current);
    positionUpdateIntervalRef.current = setInterval(updatePosition, 15000);
    trackAction('play', { bookId: activeBookId, consumableId: activeConsumableId });
    if (window.trayControls?.updatePlayingState) {
      window.trayControls.updatePlayingState(true, activeBook?.book?.name || null);
    }
  };

  const onPause = () => {
    setIsPlaying(false);
    updatePosition();
    if (positionUpdateIntervalRef.current) {
      clearInterval(positionUpdateIntervalRef.current);
      positionUpdateIntervalRef.current = null;
    }
    trackAction('pause', { bookId: activeBookId, consumableId: activeConsumableId });
    if (window.trayControls?.updatePlayingState) {
      window.trayControls.updatePlayingState(false, activeBook?.book?.name || null);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);
      if (sleepTimerMode === 'chapter' && currentChapter && cur >= currentChapter.end - 0.5) {
        audioRef.current.pause();
        setSleepTimerMode(null);
      }
    }
  };

  const onLoadedMetadata = async () => {
    const cid = activeConsumableIdRef.current || activeConsumableId;
    if (audioRef.current && cid) {
      const audioDuration = audioRef.current.duration;
      if (audioDuration && !isNaN(audioDuration)) {
        setDuration(audioDuration);
        setChapters((prev) => {
          if (!prev || prev.length === 0) {
            return generateAudioTracks(audioDuration);
          }
          return prev;
        });
      }
      await goToPosition(cid);
      setIsLoading(false);
      audioRef.current.playbackRate = playbackRate;
      if (shouldAutoPlayRef.current) {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    updatePosition();
  };

  // Tray play/pause listeners
  useEffect(() => {
    if (window.trayControls?.onPlayPause) {
      window.trayControls.onPlayPause(() => {
        togglePlayPause();
      });
    }
  }, [togglePlayPause]);

  // Cleanup on unmount & save on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const consumableId = activeConsumableIdRef.current;
      if (audioRef.current && consumableId) {
        const position = Math.floor(audioRef.current.currentTime * 1000);
        if (position > 0) {
          writeLocalPosition(consumableId, position);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (positionUpdateIntervalRef.current) {
        clearInterval(positionUpdateIntervalRef.current);
      }
      if (sleepTimerIntervalRef.current) {
        clearInterval(sleepTimerIntervalRef.current);
      }
    };
  }, []);

  return (
    <AudioContext.Provider
      value={{
        activeBook,
        activeBookId,
        activeConsumableId,
        audioSrc,
        isLoading,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        volume,
        isMuted,
        audioRef,
        chapters,
        currentChapter,
        loadBook,
        togglePlayPause,
        seek,
        skipForward,
        skipBackward,
        setRate,
        cyclePlaybackRate,
        setVolume,
        toggleMute,
        jumpToChapter,
        sleepTimerRemaining,
        sleepTimerMode,
        setSleepTimer,
        error,
        setError,
      }}
    >
      {/* Central persistent audio element */}
      <audio
        ref={audioRef}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onError={(e) => {
          console.error('Audio error:', e);
          setIsLoading(false);
          setIsPlaying(false);
        }}
      />
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
}
