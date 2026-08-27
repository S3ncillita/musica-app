import { useState, useRef, useEffect, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';

const GoHome = registerPlugin('GoHome');
import Sidebar from './components/Sidebar.jsx';
import Library from './components/Library.jsx';
import Player from './components/Player.jsx';
import PlaylistView from './components/PlaylistView.jsx';
import YouTubeSearch from './components/YouTubeSearch.jsx';
import YouTubePlayer from './components/YouTubePlayer.jsx';
import Artists from './components/Artists.jsx';
import Trending from './components/Trending.jsx';
import Downloads from './components/Downloads.jsx';
import Auth from './components/Auth.jsx';
import FullPlayer from './components/FullPlayer.jsx';
import EqPanel from './components/EqPanel.jsx';
import AppVersion from './components/AppVersion.jsx';
import Toast, { useToast } from './components/Toast.jsx';
import vybeIcon from './assets/vybe-icon.svg';
import { getApiBase } from './config.js';
import { api } from './api.js';
import { getAppVersion } from './appVersion.js';
import { initUpdateCheck } from './update.js';
import * as offline from './offline.js';
import { registerMediaSessionHandlers, updateMediaMetadata, updateMediaPlaybackState } from './mediaSession.js';
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
  const [toast, showToast] = useToast();
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentView, setCurrentView] = useState('library');
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(saved.current?.shuffle || false);
  const [repeat, setRepeat] = useState(saved.current?.repeat || 0);
  const [ytVideoId, setYtVideoId] = useState(null);
  const [ytOfflineSrc, setYtOfflineSrc] = useState(null);
  const [ytMuted, setYtMuted] = useState(true);
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [downloadingSong, setDownloadingSong] = useState(null);
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [downloadProgress, setDownloadProgress] = useState({ pct: 0, loaded: 0, total: 0 });
  const [offlineVersion, setOfflineVersion] = useState(0);
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [showFpQueue, setShowFpQueue] = useState(false);
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
  const currentSongRef = useRef(null);
  currentSongRef.current = currentSong;

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
    let el = null;
    let ro = null;
    let retryTimer = null;
    const setVar = () => {
      if (el) document.documentElement.style.setProperty('--player-height', `${el.offsetHeight}px`);
    };
    const attach = () => {
      el = document.querySelector('.player');
      if (!el) {
        retryTimer = setTimeout(attach, 200);
        return;
      }
      setVar();
      ro = new ResizeObserver(setVar);
      ro.observe(el);
    };
    attach();
    window.addEventListener('resize', setVar);
    window.addEventListener('orientationchange', setVar);
    return () => {
      clearTimeout(retryTimer);
      ro?.disconnect();
      window.removeEventListener('resize', setVar);
      window.removeEventListener('orientationchange', setVar);
    };
  }, [currentSong]);

  const backButtonStateRef = useRef({});
  backButtonStateRef.current = { showFullPlayer, showFpQueue, showEq, sidebarOpen, currentView };

  useEffect(() => {
    let listenerHandle;
    let cancelled = false;

    const handleBack = () => {
      const { showFullPlayer, showFpQueue, showEq, sidebarOpen, currentView } = backButtonStateRef.current;
      if (showFpQueue) {
        setShowFpQueue(false);
      } else if (showFullPlayer) {
        setShowFullPlayer(false);
      } else if (showEq) {
        setShowEq(false);
      } else if (sidebarOpen) {
        setSidebarOpen(false);
      } else if (currentView !== 'library') {
        navigateTo('library');
      } else {
        // moveTaskToBack() (lo que usa minimizeApp() de @capacitor/app) no
        // funciona en algunos MIUI/HyperOS de Xiaomi. Vamos directo a la
        // pantalla de inicio, que sí es confiable en todos los fabricantes.
        // TEMPORAL: diagnóstico — "GoHome is not implemented on web" indica
        // que este WebView, tras el live-redirect, se está identificando
        // como plataforma "web" en vez de "android" ante @capacitor/core.
        // Un solo cartel con todo junto: el toast anterior no encolaba,
        // se pisaba con el siguiente y solo se veía el último.
        GoHome.goHome().catch(err => {
          showToast(
            'DEBUG plat=' + window.Capacitor?.getPlatform?.() +
            ' native=' + window.Capacitor?.isNativePlatform?.() +
            ' err=' + (err?.message || err)
          );
          CapacitorApp.minimizeApp();
        });
      }
    };

    CapacitorApp.addListener('backButton', handleBack).then(handle => {
      if (cancelled) { handle.remove(); return; }
      listenerHandle = handle;
    });

    // Además del listener de Capacitor: la app también carga el puente
    // Cordova (lo necesita cordova-plugin-apkupdater), que en algunos
    // dispositivos dispara su propio evento "backbutton" y se queda con
    // el botón antes de que llegue al listener de Capacitor. Escuchamos
    // los dos apuntando a la misma lógica, como red de seguridad.
    document.addEventListener('backbutton', handleBack, false);

    // Vía más directa: MainActivity.java llama esta función a través del
    // WebView apenas capta el botón/gesto de atrás a nivel nativo, sin
    // pasar por el evento del plugin (que en algunos dispositivos no
    // llegaba de forma confiable).
    window.__vybeBackPressed = handleBack;

    return () => {
      delete window.__vybeBackPressed;
      cancelled = true;
      listenerHandle?.remove();
      document.removeEventListener('backbutton', handleBack, false);
    };
  }, []);

  useEffect(() => {
    const resyncPlaybackState = () => {
      const song = currentSongRef.current;
      if (!song) return;
      if (song.videoId || song.type === 'youtube') {
        const paused = ytPlayerRef.current?.isPaused?.();
        if (paused !== undefined) setIsPlaying(!paused);
      } else if (song.filename) {
        setIsPlaying(!audioRef.current.paused);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') resyncPlaybackState();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let listenerHandle;
    let cancelled = false;
    import('@capacitor/app').then(({ App: CapacitorApp }) => {
      if (cancelled) return;
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) resyncPlaybackState();
      }).then(handle => { listenerHandle = handle; });
    }).catch(() => {});

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      cancelled = true;
      listenerHandle?.remove();
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    getAppVersion().then(appVersion => fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, 'X-App-Version': appVersion }
    }))
      .then(res => {
        if (res.ok) return res.json();
        // Token realmente inválido/expirado (401): ahí sí hay que cerrar sesión.
        if (res.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          setUser(null);
          return null;
        }
        throw new Error('server-error');
      })
      .then(data => {
        if (!data) return;
        setUser(data.user);
        localStorage.setItem('authUser', JSON.stringify(data.user));
      })
      .catch(() => {
        // Sin conexión (u otro error de red): no borramos la sesión guardada,
        // seguimos con el usuario cacheado para poder usar la app offline.
        try {
          const cachedUser = JSON.parse(localStorage.getItem('authUser'));
          if (cachedUser) setUser(cachedUser);
        } catch {}
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

  const loadFolders = useCallback(async () => {
    const res = await api('/folders');
    setFolders(await res.json());
  }, []);

  useEffect(() => {
    if (!user) return;
    loadSongs();
    loadPlaylists();
    loadFolders();
  }, [user, loadSongs, loadPlaylists, loadFolders]);

  useEffect(() => {
    if (currentView === 'library' && user) {
      loadSongs();
      loadPlaylists();
      loadFolders();
    }
  }, [currentView, user, loadSongs, loadPlaylists, loadFolders]);

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
        setIsPlaying(true);
        offline.getOfflineSrc(song).then(offlineSrc => {
          setYtOfflineSrc(offlineSrc);
          setYtVideoId(song.videoId);
          ytPlayerRef.current?.loadAndPlay?.(song.videoId, offlineSrc);
        });
      } else if (song.filename) {
        setYtVideoId(null);
        offline.getOfflineSrc(song).then(offlineSrc => {
          audioRef.current.src = offlineSrc || `${API}/stream/${song.id}`;
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error('AUTO PLAY ERROR:', e));
        });
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
      setYtMuted(false);
      setIsPlaying(true);
      offline.getOfflineSrc(selected).then(offlineSrc => {
        setYtOfflineSrc(offlineSrc);
        setYtVideoId(selected.videoId);
        ytPlayerRef.current?.loadAndPlay?.(selected.videoId, offlineSrc);
      });
    } else if (selected?.filename) {
      setYtVideoId(null);
      offline.getOfflineSrc(selected).then(offlineSrc => {
        audioRef.current.src = offlineSrc || `${API}/stream/${selected.id}`;
        audioRef.current.load();
        audioRef.current.play().catch(e => console.error('PLAY ERROR:', e));
      });
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
        offline.getOfflineSrc(currentSong).then(offlineSrc => {
          audioRef.current.src = offlineSrc || `${API}/stream/${currentSong.id}`;
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error('PLAY ERROR:', e));
        });
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

  const mediaActionsRef = useRef({});
  mediaActionsRef.current = { togglePlay, prev, next };

  useEffect(() => {
    registerMediaSessionHandlers({
      onPlay: () => mediaActionsRef.current.togglePlay(),
      onPause: () => mediaActionsRef.current.togglePlay(),
      onPrev: () => mediaActionsRef.current.prev(),
      onNext: () => mediaActionsRef.current.next(),
    });
  }, []);

  useEffect(() => {
    if (!currentSong) return;
    updateMediaMetadata(currentSong);
  }, [currentSong]);

  useEffect(() => {
    updateMediaPlaybackState(isPlaying);
  }, [isPlaying]);

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

  const downloadQueueRef = useRef([]);
  const downloadingRef = useRef(false);

  const runDownload = async (song) => {
    const key = offline.songKey(song);
    setDownloadingKey(key);
    setDownloadingSong(song);
    setDownloadProgress({ pct: 0, loaded: 0, total: 0 });
    const mb = (n) => (n / (1024 * 1024)).toFixed(1);
    const start = performance.now();
    showToast('⬇ Descargando...');
    let latest = { loaded: 0, total: 0, pct: 0 };
    const heartbeat = setInterval(() => {
      if (latest.total > 0) {
        showToast(`⬇ Descargando... ${mb(latest.loaded)}/${mb(latest.total)} MB (${latest.pct}%)`);
      }
    }, 500);
    try {
      await offline.downloadSong(song, API, ({ loaded, total, pct }) => {
        const roundedPct = Math.round(pct * 100);
        latest = { loaded, total, pct: roundedPct };
        setDownloadProgress({ pct: roundedPct, loaded, total });
      });
      clearInterval(heartbeat);
      // Si fue muy rápido (ej. red local), damos un instante para poder leer el progreso
      // antes de reemplazarlo con el mensaje de "descargada".
      const elapsed = performance.now() - start;
      if (elapsed < 1200) await new Promise(r => setTimeout(r, 1200 - elapsed));
      showToast('✓ Canción descargada');
    } catch (e) {
      clearInterval(heartbeat);
      if (e.name !== 'AbortError') {
        console.error('DOWNLOAD ERROR:', e);
        showToast(`⚠ ${e.message || 'No se pudo descargar la canción'}`);
      }
    }
    setDownloadingKey(null);
    setDownloadingSong(null);
    setDownloadProgress({ pct: 0, loaded: 0, total: 0 });
    setOfflineVersion(v => v + 1);
  };

  const runQueue = async () => {
    if (downloadingRef.current) return;
    const next = downloadQueueRef.current[0];
    if (!next) return;
    downloadQueueRef.current = downloadQueueRef.current.slice(1);
    setDownloadQueue(downloadQueueRef.current);
    downloadingRef.current = true;
    await runDownload(next);
    downloadingRef.current = false;
    runQueue();
  };

  const downloadSong = (song) => {
    const key = offline.songKey(song);
    if (offline.isDownloaded(song)) {
      showToast('✓ Ya está descargada');
      return;
    }
    if (downloadingKey === key) return;
    if (downloadQueueRef.current.some(s => offline.songKey(s) === key)) return;
    downloadQueueRef.current = [...downloadQueueRef.current, song];
    setDownloadQueue(downloadQueueRef.current);
    runQueue();
  };

  const cancelDownload = () => {
    offline.cancelDownload();
  };

  const removeFromQueue = (song) => {
    const key = offline.songKey(song);
    downloadQueueRef.current = downloadQueueRef.current.filter(s => offline.songKey(s) !== key);
    setDownloadQueue(downloadQueueRef.current);
  };

  const removeDownload = async (song) => {
    await offline.removeDownload(song);
    setOfflineVersion(v => v + 1);
  };

  const createPlaylist = async (name, folderId = null) => {
    const res = await api('/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, folderId })
    });
    const playlist = await res.json();
    loadPlaylists();
    return playlist;
  };

  const deletePlaylist = async (id) => {
    await api(`/playlists/${id}`, { method: 'DELETE' });
    loadPlaylists();
    if (currentPlaylistId === id) setCurrentView('library');
  };

  const createFolder = async (name) => {
    await api('/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    loadFolders();
  };

  const deleteFolder = async (id) => {
    const folder = folders.find(f => f.id === id);
    await api(`/folders/${id}`, { method: 'DELETE' });
    loadFolders();
    loadPlaylists();
    if (folder && currentPlaylistId === folder.playlistId) setCurrentView('library');
  };

  const addToPlaylist = async (playlistId, songId) => {
    const res = await api(`/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId })
    });
    if (!res.ok) throw new Error('No se pudo agregar a la playlist');
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

  const viewFolder = (id) => {
    const folder = folders.find(f => f.id === id);
    if (folder) viewPlaylist(folder.playlistId);
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    showToast(`¡Bienvenido, ${userData.username}!`);
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
      <div className="app-art-wash" aria-hidden="true">
        {currentSong?.thumbnail && (
          <img src={currentSong.thumbnail} alt="" key={currentSong.thumbnail} />
        )}
      </div>
      {authLoading ? (
        <div className="auth-loading">
          <img src={vybeIcon} alt="Vybe" width="48" height="48" style={{ borderRadius: 12 }} />
        </div>
      ) : !user ? (
        <Auth onLogin={handleLogin} required />
      ) : (
        <>
      <Toast message={toast} />
      <div className="mobile-header">
        {currentView !== 'library' ? (
          <button className="mobile-back-btn" onClick={() => navigateTo('library')} title="Volver a Biblioteca">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            <span>Biblioteca</span>
          </button>
        ) : (
          <div className="mobile-logo" onClick={() => navigateTo('library')} style={{ cursor: 'pointer' }}>
            <img src={vybeIcon} alt="" width="24" height="24" style={{ borderRadius: 6 }} />
            <span>Vybe</span>
            <AppVersion />
          </div>
        )}
        {user && (
          <div className="mobile-header-actions">
            <button className="mobile-logout-btn" onClick={() => navigateTo('downloads')} title="Descargas">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            </button>
            <button className="mobile-logout-btn" onClick={() => setShowEq(true)} title="Ecualizador">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20h4V4h-4v16zm-6 0h4v-8H4v8zm12-8v8h4v-8h-4z"/>
              </svg>
            </button>
            <button className="mobile-logout-btn" onClick={handleLogout} title="Cerrar sesión">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <Sidebar
        playlists={playlists}
        folders={folders}
        currentView={currentView}
        isOpen={sidebarOpen}
        onViewLibrary={() => navigateTo('library')}
        onViewYouTube={() => navigateTo('youtube')}
        onViewArtists={() => navigateTo('artists')}
        onViewTrending={() => navigateTo('trending')}
        onViewDownloads={() => navigateTo('downloads')}
        onViewPlaylist={viewPlaylist}
        onCreatePlaylist={createPlaylist}
        onCreateFolder={createFolder}
        onDeleteFolder={deleteFolder}
        onDeletePlaylist={deletePlaylist}
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
        </div>
        {currentView === 'library' && (
          <Library
            songs={songs}
            onPlay={playSong}
            onDelete={deleteSong}
            onFiles={handleFiles}
            playlists={playlists}
            folders={folders}
            onAddToPlaylist={addToPlaylist}
            onCreateFolder={createFolder}
            onViewFolder={viewFolder}
            onDeleteFolder={deleteFolder}
            onLogout={handleLogout}
            onOpenEq={() => setShowEq(true)}
            onDownload={downloadSong}
            onRemoveDownload={removeDownload}
            isDownloaded={offline.isDownloaded}
            downloadingKey={downloadingKey}
            downloadProgress={downloadProgress}
            onCancelDownload={cancelDownload}
            offlineVersion={offlineVersion}
          />
        )}
        {currentView === 'youtube' && (
          <YouTubeSearch
            onPlay={playSong}
            onAddToLibrary={loadSongs}
            playlists={playlists}
            folders={folders}
            onAddToPlaylist={addToPlaylist}
            onCreatePlaylist={createPlaylist}
            onDownload={downloadSong}
            onRemoveDownload={removeDownload}
            isDownloaded={offline.isDownloaded}
            downloadingKey={downloadingKey}
            downloadProgress={downloadProgress}
            onCancelDownload={cancelDownload}
          />
        )}
        {currentView === 'artists' && (
          <Artists
            songs={songs}
            onPlay={playSong}
            onAddToLibrary={loadSongs}
            playlists={playlists}
            folders={folders}
            onAddToPlaylist={addToPlaylist}
            onCreatePlaylist={createPlaylist}
            onDownload={downloadSong}
            onRemoveDownload={removeDownload}
            isDownloaded={offline.isDownloaded}
            downloadingKey={downloadingKey}
            downloadProgress={downloadProgress}
            onCancelDownload={cancelDownload}
          />
        )}
        {currentView === 'trending' && (
          <Trending
            onPlay={playSong}
            onAddToLibrary={loadSongs}
            playlists={playlists}
            folders={folders}
            onAddToPlaylist={addToPlaylist}
            onCreatePlaylist={createPlaylist}
            onDownload={downloadSong}
            onRemoveDownload={removeDownload}
            isDownloaded={offline.isDownloaded}
            downloadingKey={downloadingKey}
            downloadProgress={downloadProgress}
            onCancelDownload={cancelDownload}
          />
        )}
        {currentView === 'downloads' && (
          <Downloads
            onPlay={playSong}
            onRemoveDownload={removeDownload}
            offlineVersion={offlineVersion}
            downloadingSong={downloadingSong}
            downloadProgress={downloadProgress}
            onCancelDownload={cancelDownload}
            downloadQueue={downloadQueue}
            onRemoveFromQueue={removeFromQueue}
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
            folders={folders}
            onDeleteFolder={deleteFolder}
            onDownload={downloadSong}
            onRemoveDownload={removeDownload}
            isDownloaded={offline.isDownloaded}
            downloadingKey={downloadingKey}
            downloadProgress={downloadProgress}
            onCancelDownload={cancelDownload}
          />
        )}
        <div className="scroll-spacer" />
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
        onDownload={downloadSong}
        onRemoveDownload={removeDownload}
        isDownloaded={offline.isDownloaded}
        downloadingKey={downloadingKey}
            downloadProgress={downloadProgress}
            onCancelDownload={cancelDownload}
        offlineVersion={offlineVersion}
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
          onClose={() => { setShowFullPlayer(false); setShowFpQueue(false); }}
          showQueue={showFpQueue}
          onToggleQueue={() => setShowFpQueue(v => !v)}
          onDownload={downloadSong}
          onRemoveDownload={removeDownload}
          isDownloaded={offline.isDownloaded}
          downloadingKey={downloadingKey}
          downloadProgress={downloadProgress}
          onCancelDownload={cancelDownload}
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
        offlineSrc={ytOfflineSrc}
        onReady={() => {
          ytPlayerRef.current?.setVolume(0.8);
          if (isPlaying) ytPlayerRef.current?.play();
        }}
        onStateChange={(state) => {
          if (state === 0) nextSong();
        }}
        onError={() => {
          showToast('⚠ No se pudo reproducir esta canción');
          nextSong();
        }}
      />
    </div>
  );
}
