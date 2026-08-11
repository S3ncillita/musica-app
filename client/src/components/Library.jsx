import { useState } from 'react';
import './Library.css';

export default function Library({ songs, onPlay, onDelete, onFiles, playlists, onAddToPlaylist, onLogout, onOpenEq }) {
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
        <div className="song-list">
          <div className="song-list-header">
            <span className="col-num">#</span>
            <span className="col-title">Título</span>
            <span className="col-artist">Artista</span>
            <span className="col-album">Álbum</span>
          </div>
          {filtered.map((song, i) => (
            <div
              key={song.id}
              className="song-row"
              onClick={() => onPlay(song, filtered)}
              onContextMenu={(e) => handleContext(e, song)}
            >
              <span className="col-num">{i + 1}</span>
              <span className="col-title">{song.title}</span>
              <span className="col-artist">{song.artist}</span>
              <span className="col-album">{song.album}</span>
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
