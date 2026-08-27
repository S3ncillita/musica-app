import { useState, useEffect } from 'react';
import DownloadButton from './DownloadButton.jsx';
import './FullPlayer.css';

export default function FullPlayer({ song, isPlaying, queue, queueIndex, audioRef, ytPlayerRef, onTogglePlay, onPrev, onNext, onSeek, onVolume, shuffle, onToggleShuffle, repeat, onToggleRepeat, onClose, onDownload, onRemoveDownload, isDownloaded, downloadingKey, downloadProgress, onCancelDownload, showQueue, onToggleQueue }) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [vol, setVol] = useState(0.8);
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
          setDuration(ytPlayerRef.current.getDuration?.() || 0);
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

  const handleTouchSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onSeek(pct * (duration || 0));
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    onVolume(v);
  };

  const pctProgress = duration ? (progress / duration) * 100 : 0;
  const remaining = Math.max(0, duration - progress);

  return (
    <div className="fullplayer">
      <div className="fp-art-wash" aria-hidden="true">
        {isYT && song?.thumbnail && (
          <img src={song.thumbnail} alt="" key={song.thumbnail} />
        )}
      </div>
      <div className="fp-drag-handle" />
      <div className="fullplayer-header">
        <button className="fp-close" onClick={showQueue ? onToggleQueue : onClose} title={showQueue ? 'Volver' : 'Minimizar'}>
          {showQueue ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
            </svg>
          )}
        </button>
      </div>

      <div className={`fp-body ${showQueue ? 'with-queue' : ''}`}>
        <div className="fp-main">
          <div className="fp-cover-frame">
            <div className="fp-cover-wrap">
              {isYT && song?.thumbnail ? (
                <img src={song.thumbnail} alt="" className="fp-cover" />
              ) : (
                <div className="fp-cover fp-cover-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="var(--text-muted)">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div className="fp-song-info">
            <div className="fp-song-text">
              <h2 className="fp-title">{song?.title || 'Sin selección'}</h2>
              <p className="fp-artist">{song?.artist || ''}</p>
            </div>
            {song && (
              <DownloadButton
                song={song}
                isDownloaded={isDownloaded}
                downloadingKey={downloadingKey}
                downloadProgress={downloadProgress}
                onCancelDownload={onCancelDownload}
                onDownload={onDownload}
                onRemoveDownload={onRemoveDownload}
                className="fp-download-btn"
                size={20}
              />
            )}
          </div>

          <div className="fp-progress">
            <div className="fp-bar" onClick={handleSeek} onTouchMove={handleTouchSeek}>
              <div className="fp-bar-buffered" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
              <div className="fp-bar-fill" style={{ width: `${pctProgress}%` }} />
              <div className="fp-bar-thumb" style={{ left: `${pctProgress}%` }} />
            </div>
            <div className="fp-times">
              <span className="fp-time-current">{fmt(progress)}</span>
              <span>-{fmt(remaining)}</span>
            </div>
          </div>

          <div className="fp-controls">
            <button className="fp-btn fp-btn-lg" onClick={onPrev}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>
            <button className="fp-play" onClick={onTogglePlay}>
              {isPlaying ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#000">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#000">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            <button className="fp-btn fp-btn-lg" onClick={onNext}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <div className="fp-volume">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-muted)">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <input type="range" min="0" max="1" step="0.01" value={vol} onChange={handleVolume} className="fp-volume-bar" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-muted)">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          </div>

          <div className="fp-secondary-controls">
            <button className={`fp-btn ${shuffle ? 'active' : ''}`} onClick={onToggleShuffle} title="Aleatorio">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
            </button>
            <button className={`fp-btn ${repeat > 0 ? 'active' : ''}`} onClick={onToggleRepeat} title="Repetir">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
              </svg>
              {repeat === 2 && <span className="fp-repeat-badge">1</span>}
            </button>
            <button className={`fp-btn ${showQueue ? 'active' : ''}`} onClick={onToggleQueue} title="Cola de reproducción">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
            </button>
          </div>
        </div>

        {showQueue && (
          <div className="fp-queue">
            <h3>Cola de reproducción</h3>
            <div className="fp-queue-list">
              {queue.map((s, i) => (
                <div key={i} className={`fp-queue-item ${i === queueIndex ? 'active' : ''}`}>
                  <span className="fp-queue-num">{i + 1}</span>
                  <div className="fp-queue-info">
                    <span className="fp-queue-title">{s.title}</span>
                    <span className="fp-queue-artist">{s.artist}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
