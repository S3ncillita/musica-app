import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getApiBase } from '../config.js';

const API = getApiBase();

const YouTubePlayer = forwardRef(({ videoId, onReady, onStateChange, onError }, ref) => {
  const audioRef = useRef(null);
  const callbacksRef = useRef({ onReady, onStateChange, onError });
  callbacksRef.current = { onReady, onStateChange, onError };
  const currentIdRef = useRef(null);
  const switchingRef = useRef(false);
  const hasErrorRef = useRef(false);

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

  const loadAudio = (vid, autoPlay = false) => {
    if (!vid) return;
    switchingRef.current = true;
    hasErrorRef.current = false;
    currentIdRef.current = vid;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }

    const proxyUrl = `${API}/ytdlp/stream/${vid}`;

    const onCanPlay = () => {
      if (currentIdRef.current !== vid) return;
      audioRef.current.removeEventListener('canplay', onCanPlay);
      switchingRef.current = false;
      callbacksRef.current.onReady?.(audioRef.current);
      if (autoPlay) {
        audioRef.current.muted = false;
        audioRef.current.play().catch(e => console.error('play error:', e));
        callbacksRef.current.onStateChange?.(1);
      }
    };

    audioRef.current.addEventListener('canplay', onCanPlay);
    audioRef.current.src = proxyUrl;
    audioRef.current.load();
  };

  useEffect(() => {
    if (videoId) {
      currentIdRef.current = videoId;
      loadAudio(videoId, false);
    }
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    play: () => {
      if (audioRef.current) {
        audioRef.current.muted = false;
        audioRef.current.play().catch(e => console.error('play error:', e));
        callbacksRef.current.onStateChange?.(1);
      }
    },
    pause: () => { audioRef.current?.pause(); },
    seek: (s) => { if (audioRef.current) audioRef.current.currentTime = s; },
    getCurrentTime: () => audioRef.current?.currentTime || 0,
    getDuration: () => audioRef.current?.duration || 0,
    setVolume: (v) => { if (audioRef.current) audioRef.current.volume = v; },
    getVolume: () => audioRef.current?.volume || 0.8,
    unmute: () => { if (audioRef.current) audioRef.current.muted = false; },
    loadAndPlay: (id) => {
      currentIdRef.current = id;
      loadAudio(id, true);
    },
  }));

  return <></>;
});

YouTubePlayer.displayName = 'YouTubePlayer';
export default YouTubePlayer;
