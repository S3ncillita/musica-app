import { useState } from 'react';
import './Sidebar.css';

export default function Sidebar({ playlists, currentView, isOpen, onViewLibrary, onViewYouTube, onViewArtists, onViewTrending, onViewPlaylist, onCreatePlaylist, onOpenSettings, user, onLogin, onLogout }) {
  const [newName, setNewName] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreatePlaylist(newName.trim());
      setNewName('');
      setShowInput(false);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--accent)">
          <circle cx="12" cy="12" r="12"/>
          <path d="M8 15V9l8-3v10" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Vybe</span>
      </div>

      <div className="sidebar-user">
        {user ? (
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <span className="sidebar-user-name">{user.username}</span>
            <button className="sidebar-logout-btn" onClick={onLogout} title="Cerrar sesión">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </button>
          </div>
        ) : (
          <button className="sidebar-login-btn" onClick={onLogin}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            Iniciar sesión
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${currentView === 'library' ? 'active' : ''}`}
          onClick={onViewLibrary}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          Biblioteca
        </button>
        <button
          className={`sidebar-item ${currentView === 'youtube' ? 'active' : ''}`}
          onClick={onViewYouTube}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          Buscar
        </button>
        <button
          className={`sidebar-item ${currentView === 'artists' ? 'active' : ''}`}
          onClick={onViewArtists}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          Artistas
        </button>
        <button
          className={`sidebar-item ${currentView === 'trending' ? 'active' : ''}`}
          onClick={onViewTrending}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
          </svg>
          Tendencias
        </button>
      </nav>

      <div className="sidebar-playlists">
        <div className="sidebar-playlists-header">
          <span>Playlists</span>
          <button className="add-btn" onClick={() => setShowInput(!showInput)}>+</button>
        </div>
        {showInput && (
          <div className="playlist-input">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Nombre de playlist..."
              autoFocus
            />
          </div>
        )}
        {playlists.map(p => (
          <button
            key={p.id}
            className={`sidebar-item ${currentView === 'playlist' ? 'active' : ''}`}
            onClick={() => onViewPlaylist(p.id)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
            </svg>
            {p.name}
          </button>
        ))}
      </div>

      <div className="sidebar-bottom">
        <button className="sidebar-item settings-btn" onClick={onOpenSettings}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z"/>
          </svg>
          Configuración
        </button>
      </div>
    </aside>
  );
}
