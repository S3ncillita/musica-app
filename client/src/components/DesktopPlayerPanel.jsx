import { useState } from 'react';
import DownloadButton from './DownloadButton.jsx';
import WavyProgressBar from './WavyProgressBar.jsx';
import { usePlaybackProgress } from '../usePlaybackProgress.js';
import './FullPlayer.css';
import './DesktopPlayerPanel.css';

// Panel de reproducción fijo a la derecha, solo en escritorio (ver
// .desktop-player-panel en App.css: oculto en mobile, donde sigue el mini
// reproductor de abajo + FullPlayer a pantalla completa). Reutiliza las
// mismas clases fp-* de FullPlayer.css para que se vea igual.
export default function DesktopPlayerPanel({ song, isPlaying, audioRef, ytPlayerRef, onTogglePlay, onPrev, onNext, onSeek, onVolume, shuffle, onToggleShuffle, repeat, onToggleRepeat, onDownload, onRemoveDownload, isDownloaded, downloadingKey, downloadProgress, onCancelDownload }) {
  const [vol, setVol] = useState(0.8);
  const { progress, duration, buffered, pctProgress, remaining, fmt, handleSeek, handleTouchSeek, isYT } =
    usePlaybackProgress({ song, audioRef, ytPlayerRef, onSeek });

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    onVolume(v);
  };

  return (
    <div className="desktop-player-panel">
      <div className="fp-art-wash" aria-hidden="true">
        {isYT && song?.thumbnail && (
          <img src={song.thumbnail} alt="" key={song.thumbnail} />
        )}
      </div>

      <div className="dpp-body">
        <div className="dpp-label">Reproduciendo</div>

        <div className="fp-cover-frame dpp-cover-frame">
          <div className="fp-cover-wrap">
            {isYT && song?.thumbnail ? (
              <img src={song.thumbnail} alt="" className="fp-cover dpp-cover" />
            ) : (
              <div className="fp-cover fp-cover-placeholder dpp-cover">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-muted)">
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
              size={18}
            />
          )}
        </div>

        <div className="fp-progress">
          <WavyProgressBar
            buffered={buffered}
            duration={duration}
            pctProgress={pctProgress}
            isPlaying={isPlaying}
            onSeek={handleSeek}
            onTouchSeek={handleTouchSeek}
          />
          <div className="fp-times">
            <span className="fp-time-current">{fmt(progress)}</span>
            <span>-{fmt(remaining)}</span>
          </div>
        </div>

        <div className="fp-controls dpp-controls">
          <button className="fp-btn fp-btn-lg fp-btn-round" onClick={onPrev}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          <button className="fp-play" onClick={onTogglePlay}>
            {isPlaying ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#000">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#000">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
          <button className="fp-btn fp-btn-lg fp-btn-round" onClick={onNext}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>

        <div className="fp-volume">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          <input type="range" min="0" max="1" step="0.01" value={vol} onChange={handleVolume} className="fp-volume-bar" />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </div>

        <div className="fp-secondary-controls">
          <button className={`fp-btn ${shuffle ? 'active' : ''}`} onClick={onToggleShuffle} title="Aleatorio">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
            </svg>
          </button>
          <button className={`fp-btn ${repeat > 0 ? 'active' : ''}`} onClick={onToggleRepeat} title="Repetir">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
            </svg>
            {repeat === 2 && <span className="fp-repeat-badge">1</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
