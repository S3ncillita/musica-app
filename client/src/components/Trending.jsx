import { useState, useEffect } from 'react';
import { getApiBase } from '../config.js';
import './Trending.css';

const API = getApiBase();

export default function Trending({ onPlay, playlists, onAddToPlaylist }) {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/youtube/trending`);
        setTrending(await res.json());
      } catch {
        setTrending([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const playPlaylist = (playlist) => {
    if (!playlist.songs.length) return;
    onPlay(playlist.songs[0], playlist.songs);
  };

  const playSong = (song, songs) => {
    onPlay(song, songs);
  };

  const addToLibrary = async (item) => {
    await fetch(`${API}/songs/youtube`, {
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
  };

  const fmt = (s) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="trending">
        <h1>Tendencias</h1>
        <div className="trending-loading">Cargando tendencias...</div>
      </div>
    );
  }

  return (
    <div className="trending">
      <h1>Tendencias</h1>
      <p className="trending-subtitle">Lo más escuchado ahora en YouTube</p>

      <div className="trending-playlists">
        {trending.map((pl) => (
          <div key={pl.name} className={`trending-card ${expandedPlaylist === pl.name ? 'expanded' : ''}`}>
            <div className="trending-card-header" onClick={() => setExpandedPlaylist(expandedPlaylist === pl.name ? null : pl.name)}>
              <div className="trending-card-info">
                <div className="trending-card-thumb">
                  {pl.songs[0]?.thumbnail ? (
                    <img src={pl.songs[0].thumbnail} alt="" />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--text-muted)">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  )}
                </div>
                <div className="trending-card-text">
                  <span className="trending-card-title">{pl.name}</span>
                  <span className="trending-card-count">{pl.songs.length} canciones</span>
                </div>
              </div>
              <div className="trending-card-actions">
                <button className="trending-play-btn" onClick={(e) => { e.stopPropagation(); playPlaylist(pl); }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#000">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
                <svg className={`trending-chevron ${expandedPlaylist === pl.name ? 'open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="var(--text-muted)">
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
              </div>
            </div>

            {expandedPlaylist === pl.name && (
              <div className="trending-songs">
                {pl.songs.map((song, i) => (
                  <div key={song.videoId} className="song-row" onClick={() => playSong(song, pl.songs)}>
                    <span className="col-num">{i + 1}</span>
                    <img src={song.thumbnail} alt="" className="song-thumb" />
                    <div className="song-text">
                      <span className="col-title">{song.title}</span>
                      <span className="col-artist">{song.channel}</span>
                    </div>
                    <span className="col-duration">{fmt(song.duration)}</span>
                    <button className="add-lib-btn" onClick={() => addToLibrary(song)} title="Agregar a biblioteca">+</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
