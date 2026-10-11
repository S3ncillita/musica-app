import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getApiBase } from '../config.js';

const API = getApiBase();

const YouTubePlayer = forwardRef(({ videoId, offlineSrc, onReady, onStateChange, onError }, ref) => {
  const audioRef = useRef(null);
  const callbacksRef = useRef({ onReady, onStateChange, onError });
  callbacksRef.current = { onReady, onStateChange, onError };
  const currentIdRef = useRef(null);
  const switchingRef = useRef(false);
  const hasErrorRef = useRef(false);
  const currentSrcRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }

    const onEnded = () => {
      if (!switchingRef.current && !hasErrorRef.current) {
        callbacksRef.current.onStateChange?.(0);
      }
    };
    const onErrorEvent = () => {
      hasErrorRef.current = true;
      if (!switchingRef.current) {
        callbacksRef.current.onError?.(150);
      }
    };

    audioRef.current.addEventListener('ended', onEnded);
    audioRef.current.addEventListener('error', onErrorEvent);

    return () => {
      audioRef.current?.removeEventListener('ended', onEnded);
      audioRef.current?.removeEventListener('error', onErrorEvent);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const loadAudio = (vid, autoPlay = false, srcOverride = null) => {
    if (!vid) return;
    switchingRef.current = true;
    hasErrorRef.current = false;
    currentIdRef.current = vid;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }

    const proxyUrl = srcOverride || `${API}/ytdlp/stream/${vid}`;

    const onCanPlay = () => {
      if (currentIdRef.current !== vid) return;
      audioRef.current.removeEventListener('canplay', onCanPlay);
      switchingRef.current = false;
      callbacksRef.current.onReady?.(audioRef.current);
      if (autoPlay) {
        playWithRecovery();
        callbacksRef.current.onStateChange?.(1);
      }
    };

    audioRef.current.addEventListener('canplay', onCanPlay);
    currentSrcRef.current = proxyUrl;
    audioRef.current.src = proxyUrl;
    audioRef.current.load();
  };

  // La precarga al abrir la app puede fallar (servidor frío, red que todavía
  // no volvió) y dejar el <audio> en error sin avisar. Antes de reproducir se
  // vuelve a pedir el src si quedó roto.
  const playWithRecovery = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = false;
    if ((audio.error || !audio.src) && currentSrcRef.current) {
      hasErrorRef.current = false;
      audio.src = currentSrcRef.current;
      audio.load();
    }
    audio.play().catch(e => {
      console.error('play error:', e);
      if (e?.name === 'AbortError') return;
      callbacksRef.current.onError?.(150);
    });
  };

  useEffect(() => {
    if (videoId) {
      currentIdRef.current = videoId;
      loadAudio(videoId, false, offlineSrc);
    }
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    play: () => {
      if (audioRef.current) {
        playWithRecovery();
        callbacksRef.current.onStateChange?.(1);
      }
    },
    pause: () => { audioRef.current?.pause(); },
    isPaused: () => audioRef.current?.paused ?? true,
    seek: (s) => { if (audioRef.current) audioRef.current.currentTime = s; },
    getCurrentTime: () => audioRef.current?.currentTime || 0,
    getDuration: () => audioRef.current?.duration || 0,
    setVolume: (v) => { if (audioRef.current) audioRef.current.volume = v; },
    getVolume: () => audioRef.current?.volume || 0.8,
    unmute: () => { if (audioRef.current) audioRef.current.muted = false; },
    loadAndPlay: (id, srcOverride = null) => {
      currentIdRef.current = id;
      loadAudio(id, true, srcOverride);
    },
  }));

  return <></>;
});

YouTubePlayer.displayName = 'YouTubePlayer';
export default YouTubePlayer;
