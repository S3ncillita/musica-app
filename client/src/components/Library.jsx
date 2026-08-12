import { useState } from 'react';
import DownloadButton from './DownloadButton.jsx';
import './Library.css';

export default function Library({ songs, onPlay, onDelete, onFiles, playlists, onAddToPlaylist, onLogout, onOpenEq, onDownload, onRemoveDownload, isDownloaded, downloadingKey }) {
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist.toLowerCase().includes(search.toLowerCase()) ||
    s.album.toLowerCase().includes(search.toLowerCase())
  );

  const handleContext = (e, song) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, song });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };

  return (
    <div className="library" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      <div className="view-header">
        <div>
          <h1 className="view-title">Biblioteca</h1>
          <div className="view-status">
            <span className="led" />
            <span>{songs.length} TRACKS · SYNCED</span>
          </div>
        </div>
        <div className="library-actions">
          <input
            type="text"
            placeholder="Buscar en biblioteca"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
          <button className="icon-btn" onClick={onOpenEq} title="Ecualizador">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20h4V4h-4v16zm-6 0h4v-8H4v8zm12-8v8h4v-8h-4z"/>
            </svg>
          </button>
          <button className="icon-btn icon-btn-danger" onClick={onLogout} title="Cerrar sesión">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0119 12 7 7 0 1112 5c.68 0 1.33.09 1.96.26l1.64-1.64A9 9 0 1022 12c0-2.45-.98-4.68-2.17-6.83z"/>
            </svg>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="library-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <p>{search ? 'Sin resultados' : 'Arrastrá archivos de música acá'}</p>
        </div>
      ) : (
        <div className="song-grid">
          {filtered.map((song, i) => (
            <div
              key={song.id}
              className="song-card"
              onClick={() => onPlay(song, filtered)}
              onContextMenu={(e) => handleContext(e, song)}
            >
              <div className="song-card-thumb">
                {song.thumbnail ? (
                  <img src={song.thumbnail} alt="" />
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--text-muted)">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                )}
                <button className="song-card-play" onClick={(e) => { e.stopPropagation(); onPlay(song, filtered); }} title="Reproducir">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
              <div className="song-card-info">
                <span className="song-card-title">{song.title}</span>
                <span className="song-card-artist">{song.artist}</span>
              </div>
              <div className="song-card-footer">
                <span className="song-card-num">{song.album || `#${i + 1}`}</span>
                <DownloadButton
                  song={song}
                  isDownloaded={isDownloaded}
                  downloadingKey={downloadingKey}
                  onDownload={onDownload}
                  onRemoveDownload={onRemoveDownload}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={() => setContextMenu(null)}>
          <button onClick={() => { navigator.clipboard.writeText(contextMenu.song.title); setContextMenu(null); }}>
            Copiar nombre
          </button>
          <div className="context-divider" />
          <button onClick={() => {
            isDownloaded?.(contextMenu.song) ? onRemoveDownload?.(contextMenu.song) : onDownload?.(contextMenu.song);
            setContextMenu(null);
          }}>
            {isDownloaded?.(contextMenu.song) ? 'Quitar descarga' : 'Descargar'}
          </button>
          <div className="context-divider" />
          <div className="context-submenu">
            <span>Agregar a playlist</span>
            {playlists.map(p => (
              <button key={p.id} onClick={() => { onAddToPlaylist(p.id, contextMenu.song.id); setContextMenu(null); }}>
                {p.name}
              </button>
            ))}
          </div>
          <div className="context-divider" />
          <button className="danger" onClick={() => { onDelete(contextMenu.song.id); setContextMenu(null); }}>
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
