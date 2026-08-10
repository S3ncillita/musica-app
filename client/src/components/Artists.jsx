import { useState, useMemo, useEffect } from 'react';
import { getApiBase } from '../config.js';
import Toast, { useToast } from './Toast.jsx';
import './Artists.css';

const API = getApiBase();

const POPULAR_ARTISTS = [
  'Bad Bunny', 'Taylor Swift', 'Daddy Yankee', 'Karol G', 'J Balvin',
  'Ozuna', 'Rauw Alejandro', 'Feid', 'Anuel AA', 'Nicky Jam',
  'The Weeknd', 'Drake', 'Ed Sheeran', 'Dua Lipa', 'Billie Eilish',
  'BTS', 'SZA', 'Post Malone', 'Maluma', 'Sebastian Yatra',
];

export default function Artists({ songs, onPlay, onAddToLibrary }) {
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [ytSongs, setYtSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, showToast] = useToast();
  const [popularArtists, setPopularArtists] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [artistQuery, setArtistQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const artists = useMemo(() => {
    const map = {};
    songs.forEach(s => {
      const name = s.artist || 'Desconocido';
      if (!map[name]) map[name] = { name, songs: [], thumbnail: s.thumbnail || null };
      map[name].songs.push(s);
      if (s.thumbnail && !map[name].thumbnail) map[name].thumbnail = s.thumbnail;
    });
    return Object.values(map).sort((a, b) => b.songs.length - a.songs.length);
  }, [songs]);

  useEffect(() => {
    const loadPopular = async () => {
      setLoadingPopular(true);
      const shuffled = [...POPULAR_ARTISTS].sort(() => Math.random() - 0.5).slice(0, 12);
      try {
        const res = await fetch(`${API}/youtube/artists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: shuffled }),
        });
        setPopularArtists(await res.json());
      } catch {
        setPopularArtists([]);
      }
      setLoadingPopular(false);
    };
    loadPopular();
  }, []);

  useEffect(() => {
    if (!selectedArtist) return;
    const searchResult = searchResults.find(a => a.name === selectedArtist);
    if (searchResult) {
      setYtSongs(searchResult.songs);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/youtube/search?q=${encodeURIComponent(selectedArtist + ' official')}`);
        if (!cancelled) setYtSongs(await res.json());
      } catch {
        if (!cancelled) setYtSongs([]);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [selectedArtist, searchResults]);

  const playYt = (item, list) => {
    onPlay({
      id: null,
      type: 'youtube',
      videoId: item.videoId,
      title: item.title,
      artist: item.channel,
      thumbnail: item.thumbnail,
      duration: item.duration,
    }, list.map(r => ({
      id: null,
      type: 'youtube',
      videoId: r.videoId,
      title: r.title,
      artist: r.channel,
      thumbnail: r.thumbnail,
      duration: r.duration,
    })));
  };

  const searchArtist = async () => {
    if (!artistQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API}/youtube/search?q=${encodeURIComponent(artistQuery.trim() + ' official artist')}`);
      const data = await res.json();
      const grouped = {};
      data.forEach(item => {
        const ch = item.channel;
        if (!grouped[ch]) grouped[ch] = { name: ch, thumbnail: item.thumbnail, songs: [] };
        grouped[ch].songs.push(item);
      });
      setSearchResults(Object.values(grouped));
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const addToLibrary = async (item) => {
    const res = await fetch(`${API}/songs/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: item.videoId,
        title: item.title,
        channel: item.channel,
        thumbnail: item.thumbnail,
        duration: item.duration,
      })
    });
    const song = await res.json();
    onAddToLibrary?.(song);
    showToast('✓ Añadida a la biblioteca');
  };

  const fmt = (s) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (selectedArtist) {
    const artist = artists.find(a => a.name === selectedArtist);
    const ytArtist = popularArtists.find(a => a.name === selectedArtist);
    return (
      <div className="artists">
        <Toast message={toast} />
        <button className="back-btn" onClick={() => { setSelectedArtist(null); setYtSongs([]); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Artistas
        </button>
        <div className="artist-detail-header">
          {(artist?.thumbnail || ytArtist?.thumbnail) ? (
            <img src={artist?.thumbnail || ytArtist?.thumbnail} alt="" className="artist-detail-img" />
          ) : (
            <div className="artist-detail-img artist-placeholder-lg">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-muted)">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          )}
          <div className="artist-detail-info">
            <span className="artist-detail-label">ARTISTA</span>
            <h1>{selectedArtist}</h1>
            <span className="artist-detail-count">{ytSongs.length} temas</span>
          </div>
        </div>

        {loading ? (
          <div className="artist-loading">Cargando canciones...</div>
        ) : (
          <div className="song-list">
            <div className="song-list-header">
              <span className="col-num">#</span>
              <span className="col-title">Título</span>
              <span className="col-duration">Duración</span>
              <span className="col-actions"></span>
            </div>
            {ytSongs.map((item, i) => (
              <div key={item.videoId} className="song-row" onClick={() => playYt(item, ytSongs)}>
                <span className="col-num">{i + 1}</span>
                <span className="col-title">{item.title}</span>
                <span className="col-duration">{fmt(item.duration)}</span>
                <span className="col-actions">
                  <button className="add-lib-btn" onClick={(e) => { e.stopPropagation(); addToLibrary(item); }} title="Agregar a biblioteca">+</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="artists">
      <Toast message={toast} />
      <h1>Artistas</h1>

      <div className="artist-search-bar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          value={artistQuery}
          onChange={e => setArtistQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchArtist()}
          placeholder="Buscar artista..."
        />
        <button className="yt-search-btn" onClick={searchArtist} disabled={searching}>
          {searching ? '...' : 'Buscar'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <>
          <h2 className="section-title">Resultados de búsqueda</h2>
          <div className="artist-grid">
            {searchResults.map(artist => (
              <button key={artist.name} className="artist-card" onClick={() => {
                setSelectedArtist(artist.name);
                setYtSongs(artist.songs);
              }}>
                {artist.thumbnail ? (
                  <img src={artist.thumbnail} alt="" className="artist-card-img" />
                ) : (
                  <div className="artist-card-img artist-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--text-muted)">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
                <span className="artist-card-name">{artist.name}</span>
                <span className="artist-card-count">{artist.songs.length} temas</span>
              </button>
            ))}
          </div>
        </>
      )}

      {artists.length > 0 && (
        <>
          <h2 className="section-title">Tu biblioteca</h2>
          <div className="artist-grid">
            {artists.map(artist => (
              <button key={artist.name} className="artist-card" onClick={() => setSelectedArtist(artist.name)}>
                {artist.thumbnail ? (
                  <img src={artist.thumbnail} alt="" className="artist-card-img" />
                ) : (
                  <div className="artist-card-img artist-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--text-muted)">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
                <span className="artist-card-name">{artist.name}</span>
                <span className="artist-card-count">{artist.songs.length} temas</span>
              </button>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Descubrir artistas</h2>
      {loadingPopular ? (
        <div className="artist-loading">Buscando artistas populares...</div>
      ) : (
        <div className="artist-grid">
          {popularArtists.map(artist => (
            <button key={artist.name} className="artist-card" onClick={() => setSelectedArtist(artist.name)}>
              {artist.thumbnail ? (
                <img src={artist.thumbnail} alt="" className="artist-card-img" />
              ) : (
                <div className="artist-card-img artist-placeholder">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--text-muted)">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
              <span className="artist-card-name">{artist.name}</span>
              <span className="artist-card-count">{artist.songCount} temas</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
