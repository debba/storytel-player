import {useCallback, useEffect, useRef, useState} from 'react';
import api, { trackAction } from '../utils/api';
import storage from '../utils/storage';
import {BookmarkPositional} from "../interfaces/bookmarks";

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

interface UseAudioPlayerProps {
    bookId: string | undefined;
    consumableId: string;
    playbackRate: number;
    onLoadError: (error: string) => void;
}

export const useAudioPlayer = ({bookId, consumableId, playbackRate, onLoadError}: UseAudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const positionUpdateIntervalRef = useRef<any>(null);

    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [previousVolume, setPreviousVolume] = useState(1);

    const loadAudioStream = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.post('/stream', {bookId});
            setAudioSrc(response.data.streamUrl);
        } catch (err: any) {
            onLoadError(err.response?.data?.error || 'Failed to load audio');
        } finally {
            setIsLoading(false);
        }
    }, [bookId, onLoadError]);

    const updatePosition = useCallback(async () => {
        if (!audioRef.current || !consumableId) return;

        const position = Math.floor(audioRef.current.currentTime * 1000);
        // Always persist locally first so offline listening is not lost.
        await writeLocalPosition(consumableId, position);

        try {
            await api.put(`/bookmark-positional/${consumableId}`, {position});
        } catch (error) {
            console.warn('Failed to sync position to API, kept locally', error);
        }
    }, [consumableId]);

    const goToPosition = useCallback(async () => {
        // Try remote first, then compare with local cache: the most recent
        // timestamp wins so a position listened offline is not overwritten
        // by a stale remote value once the app is online again.
        let remote: { position: number; updatedAt: string | null } | null = null;
        try {
            const response = await api.get<BookmarkPositional[]>(`/bookmark-positional/${consumableId}`);
            const entry = response.data?.find(format => format.type === 'abook');
            if (entry) {
                remote = {
                    position: entry.position || 0,
                    updatedAt: entry.updatedTime || null,
                };
            }
        } catch (error) {
            console.warn('Failed to fetch remote position, will use local cache if available', error);
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
            audioRef.current.play();
        }
    }, [consumableId]);

    const handlePlayPause = useCallback(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    }, [isPlaying]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = async () => {
        if (audioRef.current) {
            await goToPosition();
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (seekTime: number) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        if (newVolume > 0) {
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        if (!audioRef.current) return;

        if (isMuted) {
            audioRef.current.volume = previousVolume;
            setVolume(previousVolume);
            setIsMuted(false);
        } else {
            setPreviousVolume(volume);
            audioRef.current.volume = 0;
            setVolume(0);
            setIsMuted(true);
        }
    };

    const skipForward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, duration);
            trackAction('skip_forward', { bookId, consumableId, seconds: 15 });
        }
    };

    const skipBackward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
            trackAction('skip_backward', { bookId, consumableId, seconds: 15 });
        }
    };

    const handlePlay = () => {
        setIsPlaying(true);
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
        positionUpdateIntervalRef.current = setInterval(updatePosition, 30000);
        trackAction('play', { bookId, consumableId });
    };

    const handlePause = () => {
        setIsPlaying(false);
        updatePosition();
        if (positionUpdateIntervalRef.current) {
            clearInterval(positionUpdateIntervalRef.current);
            positionUpdateIntervalRef.current = null;
        }
        trackAction('pause', { bookId, consumableId });
    };

    const handleRateChange = () => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    };

    useEffect(() => {
        if (bookId) {
            loadAudioStream();
        }
    }, [bookId, loadAudioStream]);

    useEffect(() => {
        return () => {
            if (positionUpdateIntervalRef.current) {
                clearInterval(positionUpdateIntervalRef.current);
            }
        };
    }, []);

    return {
        audioRef,
        audioSrc,
        isLoading,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        handlePlayPause,
        handleTimeUpdate,
        handleLoadedMetadata,
        handleSeek,
        handleVolumeChange,
        toggleMute,
        skipForward,
        skipBackward,
        handlePlay,
        handlePause,
        handleRateChange,
    };
};
