import { useEffect, useRef, useState } from 'react';
import { getApiBase } from '../config.js';
import { api } from '../api.js';
import Toast, { useToast } from './Toast.jsx';
import DownloadButton from './DownloadButton.jsx';
import AddToLibraryButton from './AddToLibraryButton.jsx';
import './YouTubeSearch.css';

const API = getApiBase();

const toSong = (item) => ({
  type: 'youtube',
  videoId: item.videoId,
  title: item.title,
  artist: item.channel,
  thumbnail: item.thumbnail,
  duration: item.duration,
});

export default function YouTubeSearch({ onPlay, onAddToLibrary, playlists, folders, onAddToPlaylist, onCreatePlaylist, onDownload, onRemoveDownload, isDownloaded, downloadingKey, downloadProgress, onCancelDownload }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextToken, setNextToken] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [toast, showToast] = useToast();
  const sentinelRef = useRef(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setNextToken(null);
    try {
      const res = await fetch(`${API}/youtube/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.items || []);
      setNextToken(data.nextToken || null);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !nextToken) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`${API}/youtube/search?q=${encodeURIComponent(query.trim())}&token=${encodeURIComponent(nextToken)}`);
      const data = await res.json();
      setResults(prev => {
        const known = new Set(prev.map(r => r.videoId));
        return [...prev, ...(data.items || []).filter(r => !known.has(r.videoId))];
      });
      setNextToken(data.nextToken || null);
    } catch {
      setNextToken(null);
    }
    setLoadingMore(false);
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextToken, loadingMore, query]);

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
        album: '',
        inLibrary,
      })
    });
    const song = await res.json();
    setAddedIds(prev => new Set(prev).add(item.videoId));
    onAddToLibrary(song);
    return song;
  };

  const fmt = (s) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleContext = (e, item) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const playItem = (item) => {
    onPlay({
      id: null,
      type: 'youtube',
      videoId: item.videoId,
      title: item.title,
      artist: item.channel,
      thumbnail: item.thumbnail,
      duration: item.duration,
    }, results.map(r => ({
      id: null,
      type: 'youtube',
      videoId: r.videoId,
      title: r.title,
      artist: r.channel,
      thumbnail: r.thumbnail,
      duration: r.duration,
    })));
  };

  return (
    <div className="yt-search">
      <Toast message={toast} />
      <div className="view-header">
        <div>
          <h1 className="view-title">Buscar</h1>
        </div>
      </div>
      <div className="yt-search-bar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Buscar música..."
        />
        <button className="yt-search-btn" onClick={search} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      <div className="yt-results">
      <div className="song-grid">
        {results.map((item) => (
          <div
            key={item.videoId}
            className="song-card"
            onClick={() => playItem(item)}
            onContextMenu={(e) => handleContext(e, item)}
          >
            <div className="song-card-thumb">
              <img src={item.thumbnail} alt="" />
              <button className="song-card-play" onClick={(e) => { e.stopPropagation(); playItem(item); }} title="Reproducir">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </div>
            <div className="song-card-info">
              <span className="song-card-title">{item.title}</span>
              <span className="song-card-artist">{item.channel}</span>
            </div>
            <div className="song-card-footer">
              <span className="song-card-num">{fmt(item.duration)}</span>
              <AddToLibraryButton
                song={item}
                folders={folders}
                playlists={playlists}
                onAddToLibrary={addToLibrary}
                onAddToPlaylist={onAddToPlaylist}
                onCreatePlaylist={onCreatePlaylist}
                onToast={showToast}
                added={addedIds.has(item.videoId)}
                className="yt-add-btn"
              />
              <DownloadButton
                song={toSong(item)}
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
      {results.length === 0 && !loading && (
        <div className="yt-empty">Buscá tu música favorita</div>
      )}
      {results.length > 0 && nextToken && (
        <div ref={sentinelRef} className="yt-load-more">
          {loadingMore ? 'Cargando más...' : ''}
        </div>
      )}
      </div>

      {contextMenu && (
        <>
        <div className="context-menu-backdrop" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={() => setContextMenu(null)}>
          <button onClick={() => { playItem(contextMenu.item); setContextMenu(null); }}>
            Reproducir
          </button>
          <button onClick={() => { addToLibrary(contextMenu.item); showToast('✓ Añadida a la biblioteca'); setContextMenu(null); }}>
            Agregar a biblioteca
          </button>
          <div className="context-divider" />
          <div className="context-submenu">
            <span>Agregar a playlist</span>
            {playlists.map(p => (
              <button key={p.id} onClick={() => {
                addToLibrary(contextMenu.item, { inLibrary: false }).then((yt) => {
                  if (yt) onAddToPlaylist(p.id, yt.id);
                });
                showToast(`✓ Añadida a "${p.name}"`);
                setContextMenu(null);
              }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
