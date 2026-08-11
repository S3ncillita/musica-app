import { useState, useEffect } from 'react';
import { getApiBase } from '../config.js';
import { api } from '../api.js';
import './PlaylistView.css';

const API = getApiBase();

export default function PlaylistView({ playlistId, onPlay, onDelete, onRemoveSong }) {
  const [playlist, setPlaylist] = useState(null);

  useEffect(() => {
    api(`/playlists/${playlistId}`)
      .then(r => r.json())
      .then(setPlaylist);
  }, [playlistId]);

  if (!playlist) return <div className="playlist-view"><p>Cargando...</p></div>;

  return (
    <div className="playlist-view">
      <div className="playlist-header">
        <div className="playlist-cover-large">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
        </div>
        <div className="playlist-meta">
          <span className="playlist-label">PLAYLIST</span>
          <h1>{playlist.name}</h1>
          <span className="playlist-count">{playlist.songs?.length || 0} canciones</span>
        </div>
      </div>

      {playlist.songs?.length > 0 ? (
        <div className="song-list">
          <div className="song-list-header">
            <span className="col-num">#</span>
            <span className="col-title">Título</span>
            <span className="col-artist">Artista</span>
            <span className="col-album">Álbum</span>
            <span className="col-actions"></span>
          </div>
          {playlist.songs.map((song, i) => (
            <div key={song.id} className="song-row" onClick={() => onPlay(song, playlist.songs)}>
              <span className="col-num">{i + 1}</span>
              <span className="col-title">{song.title}</span>
              <span className="col-artist">{song.artist}</span>
              <span className="col-album">{song.album}</span>
              <span className="col-actions">
                <button className="remove-btn" onClick={() => onRemoveSong(playlist.id, song.id)} title="Quitar">✕</button>
              </span>
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
