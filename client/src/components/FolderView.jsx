import './PlaylistView.css';
import './Artists.css';

export default function FolderView({ folderId, folders, playlists, onViewPlaylist, onDelete }) {
  const folder = folders.find(f => f.id === folderId);
  const folderPlaylists = playlists.filter(p => p.folderId === folderId);

  if (!folder) return <div className="playlist-view"><p>Cargando...</p></div>;

  return (
    <div className="playlist-view">
      <div className="playlist-header">
        <div className="playlist-cover-large">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
        </div>
        <div className="playlist-meta">
          <span className="playlist-label">CARPETA</span>
          <h1>{folder.name}</h1>
          <span className="playlist-count">{folderPlaylists.length} playlists</span>
        </div>
        <button className="danger folder-delete-btn" onClick={() => onDelete(folder.id)}>
          Eliminar carpeta
        </button>
      </div>

      {folderPlaylists.length > 0 ? (
        <div className="artist-grid">
          {folderPlaylists.map(p => (
            <button key={p.id} className="artist-card" onClick={() => onViewPlaylist(p.id)}>
              <div className="artist-card-img artist-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--text-muted)">
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                </svg>
              </div>
              <span className="artist-card-name">{p.name}</span>
              <span className="artist-card-count">{p.songCount} temas</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="playlist-empty">
          <p>Carpeta vacía — mové playlists acá desde el sidebar (clic derecho sobre una playlist)</p>
        </div>
      )}
    </div>
  );
}
