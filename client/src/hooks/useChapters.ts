import { useCallback, useMemo, useState } from 'react';
import api from '../utils/api';
import { Chapter } from '../interfaces/chapters';
import { extractChaptersFromResponse, generateAudioTracks } from '../utils/chapters';
import { t } from 'i18next';

interface UseChaptersProps {
  consumableId: string;
  currentTime: number;
  onError: (error: string) => void;
}

export const useChapters = ({ consumableId, currentTime, onError }: UseChaptersProps) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [showChaptersModal, setShowChaptersModal] = useState(false);

  const loadChapters = useCallback(async (knownDurationSeconds?: number) => {
    if (!consumableId) return;

    try {
      const response = await api.get(`/bookmetadata/${consumableId}`);
      const list = extractChaptersFromResponse(response.data);
      if (list.length > 0) {
        setChapters(list);
        return;
      }
    } catch {
      // Try fallback to /book-details
    }

    try {
      const details = await api.get(`/book-details/${consumableId}`);
      const list = extractChaptersFromResponse(details.data);
      if (list.length > 0) {
        setChapters(list);
        return;
      }
    } catch {
      // Empty chapters on fallback failure
    }

    if (knownDurationSeconds && knownDurationSeconds > 0) {
      setChapters(generateAudioTracks(knownDurationSeconds));
    } else {
      setChapters([]);
    }
  }, [consumableId]);

  const currentChapter = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      if (currentTime >= chapter.start && currentTime < chapter.end) {
        return {
          ...chapter,
          title: chapter.title || `${t('chapters.track', { defaultValue: t('chapters.chapter', { defaultValue: 'Ljudspår' }) })} ${chapter.number}`,
        };
      }
    }

    const last = chapters[chapters.length - 1];
    if (currentTime >= last.start) {
      return {
        ...last,
        title: last.title || `${t('chapters.track', { defaultValue: t('chapters.chapter', { defaultValue: 'Ljudspår' }) })} ${last.number}`,
      };
    }

    return null;
  }, [chapters, currentTime]);

  const handleChapterClick = (
    chapterStartTime: number,
    audioRef: React.RefObject<HTMLAudioElement | null>
  ) => {
    if (audioRef.current && typeof chapterStartTime === 'number' && !isNaN(chapterStartTime)) {
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
