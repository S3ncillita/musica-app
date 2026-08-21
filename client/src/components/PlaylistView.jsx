import { useState, useEffect } from 'react';
import { getApiBase } from '../config.js';
import { api } from '../api.js';
import './PlaylistView.css';

const API = getApiBase();

export default function PlaylistView({ playlistId, onPlay, onDelete, onRemoveSong, folders, onDeleteFolder }) {
  const [playlist, setPlaylist] = useState(null);

  useEffect(() => {
    api(`/playlists/${playlistId}`)
      .then(r => r.json())
      .then(setPlaylist);
  }, [playlistId]);

  if (!playlist) return <div className="playlist-view"><p>Cargando...</p></div>;

  const folder = folders?.find(f => f.playlistId === playlist.id);

  const handleDelete = () => {
    const label = folder ? 'la carpeta' : 'la playlist';
    if (!window.confirm(`¿Eliminar ${label} "${playlist.name}"?`)) return;
    if (folder) onDeleteFolder(folder.id);
    else onDelete(playlist.id);
  };

  return (
    <div className="playlist-view">
      <div className="playlist-header">
        <div className="playlist-cover-large">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
        </div>
        <div className="playlist-meta">
          <span className="playlist-label">{folder ? 'CARPETA' : 'PLAYLIST'}</span>
          <h1>{playlist.name}</h1>
          <span className="playlist-count">{playlist.songs?.length || 0} canciones</span>
        </div>
        <button className="playlist-delete-btn" onClick={handleDelete}>
          {folder ? 'Eliminar carpeta' : 'Eliminar playlist'}
        </button>
      </div>

      {playlist.songs?.length > 0 ? (
        <div className="song-grid">
          {playlist.songs.map((song, i) => (
            <div key={song.id} className="song-card" onClick={() => onPlay(song, playlist.songs)}>
              <div className="song-card-thumb">
                {song.thumbnail ? (
                  <img src={song.thumbnail} alt="" />
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="var(--text-muted)">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                )}
                <button className="song-card-play" onClick={(e) => { e.stopPropagation(); onPlay(song, playlist.songs); }} title="Reproducir">
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
                <button className="remove-btn" onClick={(e) => { e.stopPropagation(); onRemoveSong(playlist.id, song.id); }} title="Quitar">✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="playlist-empty">
          <p>Playlist vacía — agregá canciones desde la biblioteca</p>
        </div>
      )}
    </div>
  );
}
