import { useState } from 'react';

const MENU_WIDTH = 220;
const MENU_MAX_HEIGHT = 360;

function NewPlaylistRow({ onCreate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) onCreate(trimmed);
    else setEditing(false);
  };

  if (!editing) {
    return (
      <button className="context-new-playlist" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        + Nueva playlist
      </button>
    );
  }
  return (
    <input
      className="context-new-playlist-input"
      autoFocus
      value={name}
      placeholder="Nombre..."
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && submit()}
      onBlur={submit}
    />
  );
}

export default function AddToLibraryButton({ song, folders = [], playlists = [], onAddToLibrary, onAddToPlaylist, onCreatePlaylist, added, className = '' }) {
  const [menuPos, setMenuPos] = useState(null);

  const openMenu = (e) => {
    e.stopPropagation();
    if (added) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
    const y = Math.min(rect.bottom + 4, window.innerHeight - MENU_MAX_HEIGHT - 8);
    setMenuPos({ x: Math.max(8, x), y: Math.max(8, y) });
  };

  const handleAdd = async (playlistId) => {
    setMenuPos(null);
    const savedSong = await onAddToLibrary(song);
    if (playlistId && savedSong?.id) {
      await onAddToPlaylist(playlistId, savedSong.id);
    }
  };

  const handleCreateAndAdd = async (name, folderId) => {
    setMenuPos(null);
    const savedSong = await onAddToLibrary(song);
    const playlist = await onCreatePlaylist(name, folderId);
    if (playlist?.id && savedSong?.id) {
      await onAddToPlaylist(playlist.id, savedSong.id);
    }
  };

  const ungrouped = playlists.filter(p => !p.folderId);

  return (
    <>
      <button
        className={`add-lib-btn ${added ? 'added' : ''} ${className}`}
        disabled={added}
        onClick={openMenu}
      >
        {added ? 'Añadida' : '+'}
      </button>
      {menuPos && (
        <>
          <div className="context-menu-backdrop" onClick={(e) => { e.stopPropagation(); setMenuPos(null); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuPos(null); }} />
          <div className="context-menu" style={{ top: menuPos.y, left: menuPos.x, maxHeight: MENU_MAX_HEIGHT, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleAdd(null)}>Solo Biblioteca</button>
            <div className="context-divider" />
            {folders.map(f => (
              <button key={f.id} onClick={() => handleAdd(f.playlistId)}>{f.name}</button>
            ))}
            <div className="context-submenu">
              <span>Playlists</span>
              {ungrouped.map(p => (
                <button key={p.id} onClick={() => handleAdd(p.id)}>{p.name}</button>
              ))}
              {onCreatePlaylist && <NewPlaylistRow onCreate={(name) => handleCreateAndAdd(name, null)} />}
            </div>
          </div>
        </>
      )}
    </>
  );
}
