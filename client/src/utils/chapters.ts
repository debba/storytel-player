import i18n from '../i18n';
import { Chapter } from '../interfaces/chapters';

/**
 * Normalizes raw chapter objects from the Storytel API into structured Chapter models
 * with calculated start and end times in seconds, valid durations, numbers, and titles.
 */
export function normalizeChapters(rawChapters: any[] = []): Chapter[] {
  if (!Array.isArray(rawChapters) || rawChapters.length === 0) {
    return [];
  }

  let cumulativeTime = 0;
  const chapterPrefix = i18n.t('chapters.track', { defaultValue: i18n.t('chapters.chapter', { defaultValue: 'Ljudspår' }) });

  return rawChapters.map((raw, index) => {
    const number = Number(raw.number ?? raw.order ?? raw.chapterNumber ?? raw.index ?? index + 1);

    // Duration can be in durationInSeconds, durationInMilliseconds / 1000, duration, length, or time
    let durationSec = 0;
    if (typeof raw.durationInSeconds === 'number' && !isNaN(raw.durationInSeconds)) {
      durationSec = raw.durationInSeconds;
    } else if (typeof raw.durationInMilliseconds === 'number' && !isNaN(raw.durationInMilliseconds)) {
      durationSec = raw.durationInMilliseconds / 1000;
    } else if (typeof raw.duration === 'number' && !isNaN(raw.duration)) {
      durationSec = raw.duration > 10000 ? raw.duration / 1000 : raw.duration;
    } else if (typeof raw.length === 'number' && !isNaN(raw.length)) {
      durationSec = raw.length > 10000 ? raw.length / 1000 : raw.length;
    } else if (typeof raw.time === 'number' && !isNaN(raw.time)) {
      durationSec = raw.time > 1000000 ? raw.time / 1000000 : raw.time > 1000 ? raw.time / 1000 : raw.time;
    }

    // Start time can be explicitly provided or cumulative
    let start = cumulativeTime;
    if (typeof raw.start === 'number' && !isNaN(raw.start)) {
      start = raw.start;
    } else if (typeof raw.startPositionInSeconds === 'number' && !isNaN(raw.startPositionInSeconds)) {
      start = raw.startPositionInSeconds;
    } else if (typeof raw.startPositionInMilliseconds === 'number' && !isNaN(raw.startPositionInMilliseconds)) {
      start = raw.startPositionInMilliseconds / 1000;
    } else if (typeof raw.startTime === 'number' && !isNaN(raw.startTime)) {
      start = raw.startTime > 1000 ? raw.startTime / 1000 : raw.startTime;
    }

    let end = start + durationSec;
    if (typeof raw.end === 'number' && !isNaN(raw.end)) {
      end = raw.end;
    } else if (typeof raw.endPositionInSeconds === 'number' && !isNaN(raw.endPositionInSeconds)) {
      end = raw.endPositionInSeconds;
    } else if (typeof raw.endPositionInMilliseconds === 'number' && !isNaN(raw.endPositionInMilliseconds)) {
      end = raw.endPositionInMilliseconds / 1000;
    }

    // If duration was 0 but end > start, compute duration
    if (durationSec <= 0 && end > start) {
      durationSec = end - start;
    }

    cumulativeTime = end;

    const title = (raw.title || raw.name || raw.chapterTitle || '').trim() || `${chapterPrefix} ${number}`;

    return {
      number,
      title,
      durationInSeconds: Math.max(0, durationSec),
      start: Math.max(0, start),
      end: Math.max(start, end),
    };
  });
}

/**
 * Extracts and normalizes chapter data from various API response shapes.
 */
export function extractChaptersFromResponse(data: any): Chapter[] {
  if (!data) return [];

  // 1. Direct formats array (standard Storytel playback-metadata or book-details response)
  const formats = Array.isArray(data.formats) ? data.formats : [];
  const abookFormat = formats.find((f: any) => f.type === 'abook');
  if (abookFormat?.chapters && Array.isArray(abookFormat.chapters) && abookFormat.chapters.length > 0) {
    return normalizeChapters(abookFormat.chapters);
  }
  if (abookFormat?.tracks && Array.isArray(abookFormat.tracks) && abookFormat.tracks.length > 0) {
    return normalizeChapters(abookFormat.tracks);
  }

  // 2. Direct chapters array on the payload
  if (Array.isArray(data.chapters) && data.chapters.length > 0) {
    return normalizeChapters(data.chapters);
  }

  // 3. Direct tracks array on the payload
  if (Array.isArray(data.tracks) && data.tracks.length > 0) {
    return normalizeChapters(data.tracks);
  }

  // 4. abook object containing chapters or tracks
  if (data.abook?.chapters && Array.isArray(data.abook.chapters) && data.abook.chapters.length > 0) {
    return normalizeChapters(data.abook.chapters);
  }
  if (data.abook?.tracks && Array.isArray(data.abook.tracks) && data.abook.tracks.length > 0) {
    return normalizeChapters(data.abook.tracks);
  }

  // 5. items array
  if (Array.isArray(data.items) && data.items.length > 0) {
    return normalizeChapters(data.items);
  }

  return [];
}

/**
 * Generates structured audio tracks ("Ljudspår" / "Audio Tracks") for audiobooks
 * when explicit publisher chapter markers are not present in the API, dividing the audio
 * into standard ~10-minute track segments matching the Storytel mobile app experience.
 */
export function generateAudioTracks(totalDurationInSeconds: number): Chapter[] {
  if (!totalDurationInSeconds || isNaN(totalDurationInSeconds) || totalDurationInSeconds <= 0) {
    return [];
  }

  // Dynamic segment duration based on book length
  // - Under 1 hour: 5-minute tracks (300s)
  // - 1 to 6 hours: 10-minute tracks (600s)
  // - Over 6 hours: 15-minute tracks (900s)
  let segmentDuration = 600;
  if (totalDurationInSeconds < 3600) {
    segmentDuration = 300;
  } else if (totalDurationInSeconds > 21600) {
    segmentDuration = 900;
  }

  const trackPrefix = i18n.t('chapters.track', { defaultValue: 'Ljudspår' });
  const tracks: Chapter[] = [];
  let currentTime = 0;
  let trackNumber = 1;

  while (currentTime < totalDurationInSeconds) {
    const start = currentTime;
    const end = Math.min(currentTime + segmentDuration, totalDurationInSeconds);
    const durationInSeconds = end - start;

    if (durationInSeconds > 0) {
      tracks.push({
        number: trackNumber,
        title: `${trackPrefix} ${trackNumber}`,
        durationInSeconds,
        start,
        end,
      });
      trackNumber++;
    }

    currentTime = end;
  }

  return tracks;
}
