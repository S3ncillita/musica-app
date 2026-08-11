import { useState, useEffect } from 'react';
import './Player.css';

export default function Player({ song, isPlaying, audioRef, ytPlayerRef, onTogglePlay, onPrev, onNext, onSeek, onVolume, shuffle, onToggleShuffle, repeat, onToggleRepeat, onOpenFullPlayer }) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [vol, setVol] = useState(0.8);
  const barRef = useState(null);
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
          const t = ytPlayerRef.current.getCurrentTime?.() || 0;
          const d = ytPlayerRef.current.getDuration?.() || 0;
          setProgress(t);
          setDuration(d);
          setBuffered(d);
        } catch {}
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isYT, ytPlayerRef]);

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

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    onVolume(v);
  };

  const pctProgress = duration ? (progress / duration) * 100 : 0;
  const pctBuffered = duration ? (buffered / duration) * 100 : 0;

  return (
    <div className="player">
      <div className="player-song" onClick={onOpenFullPlayer} style={{ cursor: 'pointer' }}>
        {song ? (
          <>
            {isYT && song.thumbnail ? (
              <img src={song.thumbnail} alt="" className="player-cover-img" />
            ) : (
              <div className="player-cover">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-muted)">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            )}
            <div className="player-info">
              <span className="player-title">{song.title}</span>
              <span className="player-artist">{song.artist}</span>
            </div>
          </>
        ) : (
          <div className="player-info">
            <span className="player-title" style={{ color: 'var(--text-muted)' }}>Sin selección</span>
          </div>
        )}
      </div>

      <div className="player-controls">
        <div className="player-buttons">
          <button className={`ctrl-btn ${shuffle ? 'active' : ''}`} onClick={onToggleShuffle} title="Shuffle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
            </svg>
          </button>
          <button className="ctrl-btn" onClick={onPrev} title="Anterior">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          <button className="play-btn" onClick={onTogglePlay} title={isPlaying ? 'Pausar' : 'Reproducir'}>
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#000">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#000">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          <button className="ctrl-btn" onClick={onNext} title="Siguiente">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
          <button className={`ctrl-btn ${repeat > 0 ? 'active' : ''}`} onClick={onToggleRepeat} title="Repeat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
            </svg>
            {repeat === 2 && <span className="repeat-badge">1</span>}
          </button>
        </div>
        <div className="player-progress">
          <span className="time player-time-current">{fmt(progress)}</span>
          <div className="progress-bar" ref={barRef} onClick={handleSeek}>
            <div className="progress-buffered" style={{ width: `${pctBuffered}%` }} />
            <div className="progress-fill" style={{ width: `${pctProgress}%` }} />
            <div className="progress-thumb" style={{ left: `${pctProgress}%` }} />
          </div>
          <span className="time">{fmt(duration)}</span>
        </div>
      </div>

      <div className="player-volume">
        <button className="ctrl-btn" onClick={() => {}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            {vol === 0 ? (
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            ) : vol < 0.5 ? (
              <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
            ) : (
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            )}
          </svg>
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={vol}
          onChange={handleVolume}
          className="volume-bar"
        />
      </div>
    </div>
  );
}
