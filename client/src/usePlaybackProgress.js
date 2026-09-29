import { useState, useEffect } from 'react';
import { saneDuration } from './duration.js';

// Progreso/duración/buscar, compartido entre FullPlayer y el panel fijo de
// escritorio (DesktopPlayerPanel) — antes estaba duplicado en cada uno.
export function usePlaybackProgress({ song, audioRef, ytPlayerRef, onSeek }) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const isYT = song?.videoId || song?.type === 'youtube';

  useEffect(() => {
    if (isYT) return;
    const audio = audioRef.current;
    const update = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
      if (audio.buffered.length > 0) {
        setBuffered(audio.buffered.end(audio.buffered.length - 1));
      }
    };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', update);
    audio.addEventListener('progress', update);
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('loadedmetadata', update);
      audio.removeEventListener('progress', update);
    };
  }, [audioRef, isYT]);

  useEffect(() => {
    if (!isYT) return;
    const interval = setInterval(() => {
      if (ytPlayerRef.current) {
        try {
          setProgress(ytPlayerRef.current.getCurrentTime?.() || 0);
          setDuration(saneDuration(ytPlayerRef.current.getDuration?.() || 0, song?.duration));
        } catch {}
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isYT, ytPlayerRef, song?.duration]);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onSeek(pct * (duration || 0));
  };

  const handleTouchSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onSeek(pct * (duration || 0));
  };

  const pctProgress = duration ? (progress / duration) * 100 : 0;
  const remaining = Math.max(0, duration - progress);

  return { progress, duration, buffered, pctProgress, remaining, fmt, handleSeek, handleTouchSeek, isYT };
}
