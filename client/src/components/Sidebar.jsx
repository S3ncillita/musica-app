import { useState } from 'react';
import AppVersion from './AppVersion.jsx';
import vybeLogo from '../assets/vybe-logo.svg';
import './Sidebar.css';

export default function Sidebar({ playlists, folders, currentView, isOpen, onViewLibrary, onViewYouTube, onViewArtists, onViewTrending, onViewPlaylist, onCreatePlaylist, onCreateFolder, onDeleteFolder, onDeletePlaylist, user, onLogin, onLogout }) {
  const [newName, setNewName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [showUserCard, setShowUserCard] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreatePlaylist(newName.trim());
      setNewName('');
      setShowInput(false);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowFolderInput(false);
    }
  };

  const handlePlaylistContext = (e, playlist) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'playlist', playlist });
  };

  const handleFolderContext = (e, folder) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', folder });
  };

  const ungroupedPlaylists = playlists.filter(p => !p.folderId);

  const renderPlaylistButton = (p, indented) => (
    <button
      key={p.id}
      className={`sidebar-item ${indented ? 'sidebar-item-nested' : ''} ${currentView === 'playlist' ? 'active' : ''}`}
      onClick={() => onViewPlaylist(p.id)}
      onContextMenu={(e) => handlePlaylistContext(e, p)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
      </svg>
      {p.name}
    </button>
  );

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo" onClick={onViewLibrary} style={{ cursor: 'pointer' }}>
        <img src={vybeLogo} alt="Vybe" className="sidebar-logo-img" />
        <AppVersion />
      </div>

      <div className="sidebar-user">
        {user ? (
          <div className="sidebar-user-wrap">
            <div className="sidebar-user-info" onClick={() => setShowUserCard(!showUserCard)} style={{ cursor: 'pointer' }}>
              <div className="sidebar-user-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <span className="sidebar-user-name">{user.username}</span>
            </div>
            {showUserCard && (
              <>
              <div className="context-menu-backdrop" onClick={() => setShowUserCard(false)} />
              <div className="sidebar-user-card">
                <div className="sidebar-user-avatar sidebar-user-avatar-lg">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <span className="sidebar-user-card-name">{user.username}</span>
                <span className="sidebar-user-card-email">{user.email || 'Sin correo registrado'}</span>
              </div>
              </>
            )}
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
          <span>Carpetas</span>
          <button className="add-btn" onClick={() => setShowFolderInput(!showFolderInput)}>+</button>
        </div>
        {showFolderInput && (
          <div className="playlist-input">
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              placeholder="Nombre de carpeta..."
              autoFocus
            />
          </div>
        )}
        {folders.map(f => (
          <button
            key={f.id}
            className="sidebar-item sidebar-folder-item"
            onClick={() => onViewPlaylist(f.playlistId)}
            onContextMenu={(e) => handleFolderContext(e, f)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
            <span className="sidebar-folder-name">{f.name}</span>
            <span className="sidebar-folder-count">{f.songCount}</span>
          </button>
        ))}

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
        {ungroupedPlaylists.map(p => renderPlaylistButton(p, false))}
      </div>

      {contextMenu && contextMenu.type === 'playlist' && (
        <>
        <div className="context-menu-backdrop" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={() => setContextMenu(null)}>
          <button className="danger" onClick={() => {
            if (window.confirm(`¿Eliminar la playlist "${contextMenu.playlist.name}"?`)) onDeletePlaylist(contextMenu.playlist.id);
          }}>
            Eliminar playlist
          </button>
        </div>
        </>
      )}

      {contextMenu && contextMenu.type === 'folder' && (
        <>
        <div className="context-menu-backdrop" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={() => setContextMenu(null)}>
          <button className="danger" onClick={() => {
            if (window.confirm(`¿Eliminar la carpeta "${contextMenu.folder.name}"?`)) onDeleteFolder(contextMenu.folder.id);
          }}>
            Eliminar carpeta
          </button>
        </div>
        </>
      )}
    </aside>
  );
}
