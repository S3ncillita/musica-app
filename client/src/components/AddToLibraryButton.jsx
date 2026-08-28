import { useState, useEffect } from 'react';

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

export default function AddToLibraryButton({ song, folders = [], playlists = [], onAddToLibrary, onAddToPlaylist, onCreatePlaylist, onToast, added, className = '' }) {
  const [menuPos, setMenuPos] = useState(null);

  const openMenu = (e) => {
    e.stopPropagation();
    if (added) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
    const y = Math.min(rect.bottom + 4, window.innerHeight - MENU_MAX_HEIGHT - 8);
    setMenuPos({ x: Math.max(8, x), y: Math.max(8, y) });
  };

  useEffect(() => {
    if (!menuPos) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const reclamp = () => {
      const availableHeight = Math.max(120, vv.height - 16);
      const maxHeight = Math.min(MENU_MAX_HEIGHT, availableHeight);
      setMenuPos(prev => {
        if (!prev) return prev;
        const maxY = Math.max(8, vv.height - maxHeight - 8);
        const y = Math.min(prev.y, maxY);
        if (y === prev.y && maxHeight === prev.maxHeight) return prev;
        return { ...prev, y, maxHeight };
      });
    };
    reclamp();
    vv.addEventListener('resize', reclamp);
    return () => vv.removeEventListener('resize', reclamp);
  }, [!!menuPos]);

  const handleAdd = async (playlistId, destName) => {
    setMenuPos(null);
    const savedSong = await onAddToLibrary(song, { inLibrary: !playlistId });
    if (playlistId && savedSong?.id) {
      try {
        await onAddToPlaylist(playlistId, savedSong.id);
        onToast?.(`✓ Añadida a "${destName}"`);
      } catch {
        onToast?.(`⚠ No se pudo agregar a "${destName}"`);
      }
    } else {
      onToast?.('✓ Añadida a la biblioteca');
    }
  };

  const handleCreateAndAdd = async (name, folderId) => {
    setMenuPos(null);
    const savedSong = await onAddToLibrary(song, { inLibrary: false });
    try {
      const playlist = await onCreatePlaylist(name, folderId);
      if (playlist?.id && savedSong?.id) {
        await onAddToPlaylist(playlist.id, savedSong.id);
      }
      onToast?.(`✓ Añadida a "${name}"`);
    } catch {
      onToast?.(`⚠ No se pudo crear "${name}"`);
    }
  };

  const ungrouped = playlists.filter(p => !p.folderId);

  return (
    <>
      <button
        className={`add-lib-btn ${added ? 'added' : ''} ${className}`}
        disabled={added}
        title={added ? 'Añadida' : 'Añadir'}
        onClick={openMenu}
      >
        {added ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        ) : '+'}
      </button>
      {menuPos && (
        <>
          <div className="context-menu-backdrop" onClick={(e) => { e.stopPropagation(); setMenuPos(null); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenuPos(null); }} />
          <div className="context-menu" style={{ top: menuPos.y, left: menuPos.x, maxHeight: menuPos.maxHeight || MENU_MAX_HEIGHT, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleAdd(null, null)}>Solo Biblioteca</button>
            <div className="context-divider" />
            {folders.map(f => (
              <button key={f.id} onClick={() => handleAdd(f.playlistId, f.name)}>{f.name}</button>
            ))}
            <div className="context-submenu">
              <span>Playlists</span>
              {ungrouped.map(p => (
                <button key={p.id} onClick={() => handleAdd(p.id, p.name)}>{p.name}</button>
              ))}
              {onCreatePlaylist && <NewPlaylistRow onCreate={(name) => handleCreateAndAdd(name, null)} />}
            </div>
          </div>
        </>
      )}
    </>
  );
}
