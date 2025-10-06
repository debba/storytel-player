import {useState} from 'react';

interface UseGotoModalProps {
    onSeek: (time: number) => void;
    duration: number;
    playbackRate: number;
    currentTime: number;
}

export const useGotoModal = ({onSeek, duration, playbackRate, currentTime}: UseGotoModalProps) => {
    const [showGotoModal, setShowGotoModal] = useState(false);
    const [gotoHours, setGotoHours] = useState(0);
    const [gotoMinutes, setGotoMinutes] = useState(0);
    const [gotoSeconds, setGotoSeconds] = useState(0);

    const openModal = () => {
        const adjustedTime = currentTime / playbackRate;
        const hours = Math.floor(adjustedTime / 3600);
        const minutes = Math.floor((adjustedTime % 3600) / 60);
        const seconds = Math.floor(adjustedTime % 60);

        setGotoHours(hours);
        setGotoMinutes(minutes);
        setGotoSeconds(seconds);
        setShowGotoModal(true);
    };

    const handleGotoTime = () => {
        const totalSeconds = (gotoHours * 3600) + (gotoMinutes * 60) + gotoSeconds;
        const adjustedSeconds = totalSeconds * playbackRate;

        if (adjustedSeconds >= 0 && adjustedSeconds <= duration) {
            onSeek(adjustedSeconds);
        }

        setShowGotoModal(false);
        setGotoHours(0);
        setGotoMinutes(0);
        setGotoSeconds(0);
    };

    return {
        showGotoModal,
        gotoHours,
        gotoMinutes,
        gotoSeconds,
        setShowGotoModal,
        setGotoHours,
        setGotoMinutes,
        setGotoSeconds,
        handleGotoTime,
        openModal,
    };
};
