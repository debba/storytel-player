import {useCallback, useEffect, useRef, useState} from 'react';
import api from '../utils/api';

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

        try {
            const position = Math.floor(audioRef.current.currentTime * 1000);
            await api.put(`/bookmark-positional/${consumableId}`, {position});
        } catch (error) {
            console.error('Failed to update position:', error);
        }
    }, [consumableId]);

    const goToPosition = useCallback(async () => {
        try {
            const response = await api.get(`/bookmark-positional/${consumableId}`);
            const {data} = response;

            if (data.length === 1 && 'position' in data[0] && audioRef.current) {
                audioRef.current.currentTime = Math.floor(data[0].position / 1000);
                audioRef.current.play();
            }
        } catch (error) {
            console.error('Failed to go to position:', error);
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
        }
    };

    const skipBackward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
        }
    };

    const handlePlay = () => {
        setIsPlaying(true);
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
        positionUpdateIntervalRef.current = setInterval(updatePosition, 30000);
    };

    const handlePause = () => {
        setIsPlaying(false);
        updatePosition();
        if (positionUpdateIntervalRef.current) {
            clearInterval(positionUpdateIntervalRef.current);
            positionUpdateIntervalRef.current = null;
        }
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
