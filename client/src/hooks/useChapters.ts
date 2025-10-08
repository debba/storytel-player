import {useCallback, useMemo, useState} from 'react';
import api from '../utils/api';
import {Chapter} from '../interfaces/chapters';
import {t} from "i18next";
import {BookMetaData} from "../interfaces/books";

interface UseChaptersProps {
    consumableId: string;
    currentTime: number;
    onError: (error: string) => void;
}

export const useChapters = ({consumableId, currentTime, onError}: UseChaptersProps) => {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [showChaptersModal, setShowChaptersModal] = useState(false);

    const loadChapters = useCallback(async () => {
        try {
            const response = await api.get<BookMetaData>(`/bookmetadata/${consumableId}`);
            const {data} = response;

            const chapters = data.formats?.find(
                format => format.type === 'abook'
            )?.chapters || [];

            setChapters(chapters);

        } catch (error: any) {
            onError(error.response?.data?.error || 'Failed to load chapters');
        }
    }, [consumableId, onError]);

    const currentChapter = useMemo(() => {
        let cumulativeTime = 0;

        for (let i = 0; i < chapters?.length; i++) {
            const chapter = chapters[i];
            const chapterStart = cumulativeTime;
            const chapterEnd = cumulativeTime + (chapter.durationInSeconds || 0);

            if (currentTime >= chapterStart && currentTime < chapterEnd) {
                return {
                    ...chapter,
                    title: chapter.title || `${t('chapters.chapter')} ${chapter.number}`,
                    start: chapterStart,
                    end: chapterEnd
                };
            }

            cumulativeTime = chapterEnd;
        }

        return null;
    }, [chapters, currentTime]);

    const handleChapterClick = (chapterStartTime: number, audioRef: React.RefObject<HTMLAudioElement | null>) => {
        if (audioRef.current) {
            audioRef.current.currentTime = chapterStartTime;
        }
    };

    return {
        chapters,
        currentChapter,
        showChaptersModal,
        setShowChaptersModal,
        loadChapters,
        handleChapterClick,
    };
};
