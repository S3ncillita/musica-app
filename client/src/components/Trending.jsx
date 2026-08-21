import { useState, useEffect } from 'react';
import { getApiBase } from '../config.js';
import { api } from '../api.js';
import Toast, { useToast } from './Toast.jsx';
import DownloadButton from './DownloadButton.jsx';
import AddToLibraryButton from './AddToLibraryButton.jsx';
import './Trending.css';

const API = getApiBase();

const toSong = (song) => ({
  type: 'youtube',
  videoId: song.videoId,
  title: song.title,
  artist: song.channel,
  thumbnail: song.thumbnail,
  duration: song.duration,
});

export default function Trending({ onPlay, onAddToLibrary, playlists, folders, onAddToPlaylist, onCreatePlaylist, onDownload, onRemoveDownload, isDownloaded, downloadingKey, downloadProgress, onCancelDownload }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [toast, showToast] = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/youtube/trending`);
        setTrending(await res.json());
      } catch {
        setTrending([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const playPlaylist = (playlist) => {
    if (!playlist.songs.length) return;
    onPlay(playlist.songs[0], playlist.songs);
  };

  const playSong = (song, songs) => {
    onPlay(song, songs);
  };

  const addToLibrary = async (item, { inLibrary = true } = {}) => {
    const res = await api('/songs/youtube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: item.videoId,
        title: item.title,
        channel: item.channel,
        thumbnail: item.thumbnail,
        duration: item.duration,
        inLibrary,
      })
    });
    const song = await res.json();
    setAddedIds(prev => new Set(prev).add(item.videoId));
    onAddToLibrary?.(song);
    return song;
  };

  const fmt = (s) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="trending">
        <div className="view-header">
          <div>
            <h1 className="view-title">Tendencias</h1>
            <div className="view-status">
              <span className="led" />
              <span>TOP_CHARTS</span>
            </div>
          </div>
        </div>
        <div className="trending-loading">Cargando tendencias...</div>
      </div>
    );
  }

  return (
    <div className="trending">
      <Toast message={toast} />
      <div className="view-header">
        <div>
          <h1 className="view-title">Tendencias</h1>
          <div className="view-status">
            <span className="led" />
            <span>TOP_CHARTS</span>
          </div>
        </div>
      </div>
      <p className="trending-subtitle">Lo más escuchado ahora en YouTube</p>

      <div className="trending-playlists">
        {trending.map((pl) => (
          <div key={pl.name} className={`trending-card ${expandedPlaylist === pl.name ? 'expanded' : ''}`}>
            <div className="trending-card-header" onClick={() => setExpandedPlaylist(expandedPlaylist === pl.name ? null : pl.name)}>
              <div className="trending-card-info">
                <div className="trending-card-thumb">
                  {pl.songs[0]?.thumbnail ? (
                    <img src={pl.songs[0].thumbnail} alt="" />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--text-muted)">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  )}
                </div>
                <div className="trending-card-text">
                  <span className="trending-card-title">{pl.name}</span>
                  <span className="trending-card-count">{pl.songs.length} canciones</span>
                </div>
              </div>
              <div className="trending-card-actions">
                <button className="trending-play-btn" onClick={(e) => { e.stopPropagation(); playPlaylist(pl); }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#000">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
                <svg className={`trending-chevron ${expandedPlaylist === pl.name ? 'open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)">
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
              </div>
            </div>

            {expandedPlaylist === pl.name && (
              <div className="trending-songs song-grid">
                {pl.songs.map((song, i) => (
                  <div key={song.videoId} className="song-card" onClick={() => playSong(song, pl.songs)}>
                    <div className="song-card-thumb">
                      {song.thumbnail ? (
                        <img src={song.thumbnail} alt="" />
                      ) : (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--text-muted)">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      )}
                      <button className="song-card-play" onClick={(e) => { e.stopPropagation(); playSong(song, pl.songs); }} title="Reproducir">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </button>
                    </div>
                    <div className="song-card-info">
                      <span className="song-card-title">{song.title}</span>
                      <span className="song-card-artist">{song.channel}</span>
                    </div>
                    <div className="song-card-footer">
                      <span className="song-card-num">{fmt(song.duration)}</span>
                      <AddToLibraryButton
                        song={song}
                        folders={folders}
                        playlists={playlists}
                        onAddToLibrary={addToLibrary}
                        onAddToPlaylist={onAddToPlaylist}
                        onCreatePlaylist={onCreatePlaylist}
                        onToast={showToast}
                        added={addedIds.has(song.videoId)}
                        className="add-lib-btn"
                      />
                      <DownloadButton
                        song={toSong(song)}
                        isDownloaded={isDownloaded}
                        downloadingKey={downloadingKey}
                    downloadProgress={downloadProgress}
                    onCancelDownload={onCancelDownload}
                        onDownload={onDownload}
                        onRemoveDownload={onRemoveDownload}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
