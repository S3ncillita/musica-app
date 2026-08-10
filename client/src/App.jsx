import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Library from './components/Library.jsx';
import Player from './components/Player.jsx';
import PlaylistView from './components/PlaylistView.jsx';
import YouTubeSearch from './components/YouTubeSearch.jsx';
import YouTubePlayer from './components/YouTubePlayer.jsx';
import Artists from './components/Artists.jsx';
import Trending from './components/Trending.jsx';
import Settings from './components/Settings.jsx';
import Auth from './components/Auth.jsx';
import FullPlayer from './components/FullPlayer.jsx';
import { getApiBase } from './config.js';
import './App.css';

const API = getApiBase();

function loadSavedState() {
  try {
    const saved = localStorage.getItem('musicPlayerState');
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export default function App() {
  const saved = useRef(loadSavedState());
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('authUser')) || null; } catch { return null; }
  });
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [currentView, setCurrentView] = useState('library');
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(saved.current?.shuffle || false);
  const [repeat, setRepeat] = useState(saved.current?.repeat || 0);
  const [ytVideoId, setYtVideoId] = useState(null);
  const [ytMuted, setYtMuted] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const audioRef = useRef(new Audio());
  const ytPlayerRef = useRef(null);
  const progressInterval = useRef(null);
  const playingFromClick = useRef(false);
  const restoringRef = useRef(false);

  useEffect(() => {
    const unlockAudio = () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        setUser(data.user);
        localStorage.setItem('authUser', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const loadSongs = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API}/songs`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    setSongs(await res.json());
  }, []);

  const loadPlaylists = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API}/playlists`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    setPlaylists(await res.json());
  }, []);

  useEffect(() => {
    if (!user) return;
    loadSongs();
    loadPlaylists();
  }, [user, loadSongs, loadPlaylists]);

  useEffect(() => {
    if (currentView === 'library' && user) {
      loadSongs();
      loadPlaylists();
    }
  }, [currentView, user, loadSongs, loadPlaylists]);

  useEffect(() => {
    if (!currentSong) return;
    localStorage.setItem('musicPlayerState', JSON.stringify({
      currentSong,
      queue,
      queueIndex,
      shuffle,
      repeat,
    }));
  }, [currentSong, queue, queueIndex, shuffle, repeat]);

  useEffect(() => {
    if (!saved.current?.currentSong || !songs.length) return;
    const s = saved.current.currentSong;
    const exists = s.videoId
      ? true
      : songs.some(x => x.id === s.id);
    if (!exists) return;
    setCurrentSong(s);
    restoringRef.current = true;
    setQueue(saved.current.queue);
    setQueueIndex(saved.current.queueIndex);
    if (s.videoId || s.type === 'youtube') {
      setYtVideoId(s.videoId);
    }
    saved.current = null;
  }, [songs]);

  const nextSong = useCallback(() => {
    restoringRef.current = false;
    if (queue.length === 0) return;
    if (shuffle) {
      setQueueIndex(Math.floor(Math.random() * queue.length));
    } else if (queueIndex < queue.length - 1) {
      setQueueIndex(queueIndex + 1);
    } else if (repeat === 1) {
      setQueueIndex(0);
    } else {
      setIsPlaying(false);
    }
  }, [queue, queueIndex, shuffle, repeat]);

  useEffect(() => {
    const audio = audioRef.current;
    const onEnded = () => {
      if (repeat === 2) {
        audio.currentTime = 0;
        audio.play();
      } else {
        nextSong();
      }
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [repeat, nextSong]);

  useEffect(() => {
    if (queueIndex >= 0 && queue[queueIndex]) {
      const song = queue[queueIndex];
      setCurrentSong(song);

      if (playingFromClick.current) {
        playingFromClick.current = false;
        return;
      }

    if (restoringRef.current) {
      return;
    }

      if (song.videoId || song.type === 'youtube') {
        audioRef.current.pause();
        setYtVideoId(song.videoId);
        setIsPlaying(true);
        ytPlayerRef.current?.loadAndPlay?.(song.videoId);
      } else if (song.filename) {
        setYtVideoId(null);
        audioRef.current.src = `${API}/stream/${song.id}`;
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error('AUTO PLAY ERROR:', e));
      }
    }
  }, [queueIndex, queue]);

  useEffect(() => {
    if (!ytVideoId) return;
    if (!isPlaying) {
      ytPlayerRef.current?.pause();
    }
  }, [isPlaying, ytVideoId]);

  useEffect(() => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(0.8);
    }
  }, [ytVideoId]);

  const playSong = (song, list = null) => {
    restoringRef.current = false;
    const targetList = list || songs;
    const idx = targetList.findIndex(s =>
      (song.videoId || song.type === 'youtube') ? s.videoId === song.videoId : s.id === song.id
    );
    const selected = targetList[idx >= 0 ? idx : 0];
    playingFromClick.current = true;
    setQueue(targetList);
    setQueueIndex(idx >= 0 ? idx : 0);
    setCurrentSong(selected);
    setIsPlaying(true);

    if (selected?.videoId || selected?.type === 'youtube') {
      audioRef.current.pause();
      setYtVideoId(selected.videoId);
      setYtMuted(false);
      setIsPlaying(true);
      ytPlayerRef.current?.loadAndPlay?.(selected.videoId);
    } else if (selected?.filename) {
      setYtVideoId(null);
      audioRef.current.src = `${API}/stream/${selected.id}`;
      audioRef.current.load();
      audioRef.current.play().catch(e => console.error('PLAY ERROR:', e));
    }
  };

  const togglePlay = () => {
    restoringRef.current = false;
    if (currentSong?.videoId || currentSong?.type === 'youtube') {
      if (isPlaying && !ytMuted) {
        ytPlayerRef.current?.pause();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current?.play();
        setYtMuted(false);
        setIsPlaying(true);
      }
    } else {
      if (!currentSong?.filename) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = `${API}/stream/${currentSong.id}`;
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error('PLAY ERROR:', e));
      }
    }
  };

  const seek = (time) => {
    if (currentSong?.videoId || currentSong?.type === 'youtube') {
      ytPlayerRef.current?.seek(time);
    } else {
      audioRef.current.currentTime = time;
    }
  };

  const volume = (v) => {
    if (currentSong?.videoId || currentSong?.type === 'youtube') {
      ytPlayerRef.current?.setVolume(v);
    } else {
      audioRef.current.volume = v;
    }
  };

  const prev = () => {
    restoringRef.current = false;
    if (currentSong?.videoId || currentSong?.type === 'youtube') {
      const t = ytPlayerRef.current?.getCurrentTime() || 0;
      if (t > 3) {
        ytPlayerRef.current?.seek(0);
      } else if (queueIndex > 0) {
        setQueueIndex(queueIndex - 1);
      }
    } else {
      if (audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
      } else if (queueIndex > 0) {
        setQueueIndex(queueIndex - 1);
      }
    }
  };

  const next = () => nextSong();

  const handleFiles = async (files) => {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    await fetch(`${API}/songs/upload`, { method: 'POST', body: fd });
    loadSongs();
  };

  const deleteSong = async (id) => {
    await fetch(`${API}/songs/${id}`, { method: 'DELETE' });
    loadSongs();
  };

  const createPlaylist = async (name) => {
    await fetch(`${API}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    loadPlaylists();
  };

  const deletePlaylist = async (id) => {
    await fetch(`${API}/playlists/${id}`, { method: 'DELETE' });
    loadPlaylists();
    if (currentPlaylistId === id) setCurrentView('library');
  };

  const addToPlaylist = async (playlistId, songId) => {
    await fetch(`${API}/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId })
    });
  };

  const removeFromPlaylist = async (playlistId, songId) => {
    await fetch(`${API}/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' });
    if (currentPlaylistId === playlistId) setCurrentView('playlist');
  };

  const viewPlaylist = (id) => {
    setCurrentPlaylistId(id);
    setCurrentView('playlist');
    setSidebarOpen(false);
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('musicPlayerState');
    try { audioRef.current.pause(); } catch {}
    try { ytPlayerRef.current?.pause(); } catch {}
    setUser(null);
  };

  return (
    <div className={`app ${!user ? 'auth-required' : ''}`}>
      {authLoading ? (
        <div className="auth-loading">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--accent)">
            <circle cx="12" cy="12" r="12"/>
            <path d="M8 15V9l8-3v10" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      ) : !user ? (
        <Auth onLogin={handleLogin} required />
      ) : (
        <>
      <div className="mobile-header">
        <div className="mobile-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--accent)">
            <circle cx="12" cy="12" r="12"/>
            <path d="M8 15V9l8-3v10" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Vybe</span>
        </div>
        {user && (
          <button className="mobile-logout-btn" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        )}
      </div>

      <Sidebar
        playlists={playlists}
        currentView={currentView}
        isOpen={sidebarOpen}
        onViewLibrary={() => navigateTo('library')}
        onViewYouTube={() => navigateTo('youtube')}
        onViewArtists={() => navigateTo('artists')}
        onViewTrending={() => navigateTo('trending')}
        onViewPlaylist={viewPlaylist}
        onCreatePlaylist={createPlaylist}
        onOpenSettings={() => { setShowSettings(true); }}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <main className="main">
        <div className="mobile-nav">
          <button className={`mobile-nav-card ${currentView === 'library' ? 'active' : ''}`} onClick={() => navigateTo('library')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            <span>Biblioteca</span>
          </button>
          <button className={`mobile-nav-card ${currentView === 'youtube' ? 'active' : ''}`} onClick={() => navigateTo('youtube')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <span>Buscar</span>
          </button>
          <button className={`mobile-nav-card ${currentView === 'artists' ? 'active' : ''}`} onClick={() => navigateTo('artists')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span>Artistas</span>
          </button>
          <button className={`mobile-nav-card ${currentView === 'trending' ? 'active' : ''}`} onClick={() => navigateTo('trending')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
            <span>Tendencias</span>
          </button>
          <button className={`mobile-nav-card ${currentView === 'playlist' ? 'active' : ''}`} onClick={() => setShowSettings(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z"/></svg>
            <span>Ajustes</span>
          </button>
        </div>
        {currentView === 'library' && (
          <Library
            songs={songs}
            onPlay={playSong}
            onDelete={deleteSong}
            onFiles={handleFiles}
            playlists={playlists}
            onAddToPlaylist={addToPlaylist}
          />
        )}
        {currentView === 'youtube' && (
          <YouTubeSearch
            onPlay={playSong}
            onAddToLibrary={loadSongs}
            playlists={playlists}
            onAddToPlaylist={addToPlaylist}
          />
        )}
        {currentView === 'artists' && (
          <Artists
            songs={songs}
            onPlay={playSong}
            onAddToLibrary={loadSongs}
            playlists={playlists}
            onAddToPlaylist={addToPlaylist}
          />
        )}
        {currentView === 'trending' && (
          <Trending
            onPlay={playSong}
            onAddToLibrary={loadSongs}
            playlists={playlists}
            onAddToPlaylist={addToPlaylist}
          />
        )}
        {currentView === 'playlist' && currentPlaylistId && (
          <PlaylistView
            playlistId={currentPlaylistId}
            onPlay={playSong}
            onDelete={deletePlaylist}
            onRemoveSong={removeFromPlaylist}
            playlists={playlists}
            onAddToPlaylist={addToPlaylist}
          />
        )}
      </main>
      <Player
        song={currentSong}
        isPlaying={isPlaying}
        audioRef={audioRef}
        ytPlayerRef={ytPlayerRef}
        onTogglePlay={togglePlay}
        onPrev={prev}
        onNext={next}
        onSeek={seek}
        onVolume={volume}
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle(!shuffle)}
        repeat={repeat}
        onToggleRepeat={() => setRepeat((repeat + 1) % 3)}
        currentSong={currentSong}
        onOpenFullPlayer={() => setShowFullPlayer(true)}
      />
      {showFullPlayer && currentSong && (
        <FullPlayer
          song={currentSong}
          isPlaying={isPlaying}
          queue={queue}
          queueIndex={queueIndex}
          audioRef={audioRef}
          ytPlayerRef={ytPlayerRef}
          onTogglePlay={togglePlay}
          onPrev={prev}
          onNext={next}
          onSeek={seek}
          onVolume={volume}
          shuffle={shuffle}
          onToggleShuffle={() => setShuffle(!shuffle)}
          repeat={repeat}
          onToggleRepeat={() => setRepeat((repeat + 1) % 3)}
          onClose={() => setShowFullPlayer(false)}
        />
      )}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </>
      )}
      <YouTubePlayer
        ref={ytPlayerRef}
        videoId={ytVideoId}
        onReady={() => {
          ytPlayerRef.current?.setVolume(0.8);
          if (isPlaying) ytPlayerRef.current?.play();
        }}
        onStateChange={(state) => {
          if (state === 0) nextSong();
        }}
        onError={() => {}}
      />
    </div>
  );
}
