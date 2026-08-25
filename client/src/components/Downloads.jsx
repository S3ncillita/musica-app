import { useEffect, useState } from 'react';
import * as offline from '../offline.js';
import DownloadButton from './DownloadButton.jsx';
import './Downloads.css';

function toPlayableSong(entry) {
  if (entry.key.startsWith('yt_')) {
    return {
      videoId: entry.key.slice(3),
      type: 'youtube',
      title: entry.title,
      artist: entry.artist,
      thumbnail: entry.thumbnail,
    };
  }
  return {
    id: Number(entry.key.slice(6)),
    filename: 'offline',
    title: entry.title,
    artist: entry.artist,
    thumbnail: entry.thumbnail,
  };
}

export default function Downloads({ onPlay, onRemoveDownload, offlineVersion, downloadingSong, downloadProgress, onCancelDownload, downloadQueue = [], onRemoveFromQueue }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(offline.listDownloaded());
  }, [offlineVersion]);

  const songs = entries.map(toPlayableSong);
  const { pct = 0, loaded = 0, total = 0 } = downloadProgress || {};
  const mb = (n) => (n / (1024 * 1024)).toFixed(1);

  return (
    <div className="downloads">
      <div className="view-header">
        <div>
          <h1 className="view-title">Descargas</h1>
          <div className="view-status">
            <span className="led" />
            <span>{entries.length} OFFLINE</span>
          </div>
        </div>
      </div>

      {downloadingSong && (
        <div className="downloading-card">
          <div className="downloading-thumb">
            {downloadingSong.thumbnail ? (
              <img src={downloadingSong.thumbnail} alt="" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--text-muted)">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            )}
          </div>
          <div className="downloading-info">
            <span className="downloading-title">{downloadingSong.title}</span>
            <div className="downloading-bar">
              <div className="downloading-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="downloading-pct">
              {total ? `${mb(loaded)}/${mb(total)} MB · ` : ''}{pct}%
            </span>
          </div>
          <button className="downloading-cancel" onClick={onCancelDownload} title="Cancelar">✕</button>
        </div>
      )}

      {downloadQueue.length > 0 && (
        <div className="download-queue">
          <span className="download-queue-title">En cola ({downloadQueue.length})</span>
          {downloadQueue.map((song) => (
            <div key={offline.songKey(song)} className="download-queue-item">
              <span className="download-queue-item-title">{song.title}</span>
              <button onClick={() => onRemoveFromQueue?.(song)} title="Quitar de la cola">✕</button>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !downloadingSong && downloadQueue.length === 0 ? (
        <div className="downloads-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          <p>No tenés canciones descargadas todavía</p>
        </div>
      ) : (
        <div className="song-grid">
          {entries.map((entry, i) => {
            const song = songs[i];
            return (
              <div key={entry.key} className="song-card" onClick={() => onPlay(song, songs)}>
                <div className="song-card-thumb">
                  {entry.thumbnail ? (
                    <img src={entry.thumbnail} alt="" />
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--text-muted)">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  )}
                  <button className="song-card-play" onClick={(e) => { e.stopPropagation(); onPlay(song, songs); }} title="Reproducir">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
                <div className="song-card-info">
                  <span className="song-card-title">{entry.title}</span>
                  <span className="song-card-artist">{entry.artist}</span>
                </div>
                <div className="song-card-footer">
                  <span className="song-card-num">
                    {new Date(entry.downloadedAt).toLocaleDateString()}
                  </span>
                  <DownloadButton
                    song={song}
                    isDownloaded={() => true}
                    downloadingKey={null}
                    downloadProgress={{ pct: 0, loaded: 0, total: 0 }}
                    onCancelDownload={() => {}}
                    onDownload={() => {}}
                    onRemoveDownload={onRemoveDownload}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
