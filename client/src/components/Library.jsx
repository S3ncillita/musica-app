import { useState, useRef } from 'react';
import './Library.css';

export default function Library({ songs, onPlay, onDelete, onFiles, playlists, onAddToPlaylist }) {
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const fileRef = useRef();

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
      <div className="library-header">
        <h1>Biblioteca</h1>
        <div className="library-actions">
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
          <button className="btn-primary" onClick={() => fileRef.current.click()}>
            Subir música
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".mp3,.wav,.ogg,.flac,.m4a,.aac,.wma"
            style={{ display: 'none' }}
            onChange={e => onFiles(e.target.files)}
          />
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
