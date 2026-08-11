import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Library from './components/Library.jsx';
import Player from './components/Player.jsx';
import PlaylistView from './components/PlaylistView.jsx';
import YouTubeSearch from './components/YouTubeSearch.jsx';
import YouTubePlayer from './components/YouTubePlayer.jsx';
import Artists from './components/Artists.jsx';
import Trending from './components/Trending.jsx';
import Auth from './components/Auth.jsx';
import FullPlayer from './components/FullPlayer.jsx';
import EqPanel from './components/EqPanel.jsx';
import AppVersion from './components/AppVersion.jsx';
import { getApiBase } from './config.js';
import { api } from './api.js';
import { initUpdateCheck } from './update.js';
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
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [showEq, setShowEq] = useState(false);
  const [eq, setEq] = useState({ preset: 'flat', low: 0, mid: 0, high: 0 });
  const eqCtxRef = useRef(null);
  const eqFiltersRef = useRef(null);
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
    initUpdateCheck();
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
    const res = await api('/songs');
    setSongs(await res.json());
  }, []);

  const loadPlaylists = useCallback(async () => {
    const res = await api('/playlists');
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
    await api('/songs/upload', { method: 'POST', body: fd });
    loadSongs();
  };

  const deleteSong = async (id) => {
    await api(`/songs/${id}`, { method: 'DELETE' });
    loadSongs();
  };

  const createPlaylist = async (name) => {
    await api('/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    loadPlaylists();
  };

  const deletePlaylist = async (id) => {
    await api(`/playlists/${id}`, { method: 'DELETE' });
    loadPlaylists();
    if (currentPlaylistId === id) setCurrentView('library');
  };

  const addToPlaylist = async (playlistId, songId) => {
    await api(`/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId })
    });
  };

  const removeFromPlaylist = async (playlistId, songId) => {
    await api(`/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' });
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
    setSongs([]);
    setPlaylists([]);
    setUser(null);
  };

  const initEqGraph = () => {
    if (eqFiltersRef.current) return eqFiltersRef.current;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaElementSource(audioRef.current);
      const low = ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 200;
      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;
      const high = ctx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 4000;
      src.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(ctx.destination);
      eqCtxRef.current = ctx;
      eqFiltersRef.current = { low, mid, high };
      return eqFiltersRef.current;
    } catch (e) {
      console.error('EQ init failed', e);
      return null;
    }
  };

  const handleEqApply = (next) => {
    setEq(next);
    const filters = initEqGraph();
    if (!filters) return;
    filters.low.gain.value = next.low;
    filters.mid.gain.value = next.mid;
    filters.high.gain.value = next.high;
    eqCtxRef.current?.resume?.();
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
          <AppVersion />
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
          <button className={`mobile-nav-card ${showEq ? 'active' : ''}`} onClick={() => setShowEq(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
            <span>Ecualizador</span>
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
            onLogout={handleLogout}
            onOpenEq={() => setShowEq(true)}
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
      {showEq && (
        <EqPanel
          eq={eq}
          onApply={handleEqApply}
          onClose={() => setShowEq(false)}
        />
      )}
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
