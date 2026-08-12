import { MediaSession } from '@capgo/capacitor-media-session';

let handlersRegistered = false;

export function registerMediaSessionHandlers({ onPlay, onPause, onPrev, onNext }) {
  if (handlersRegistered) return;
  handlersRegistered = true;
  try {
    MediaSession.setActionHandler({ action: 'play' }, () => onPlay());
    MediaSession.setActionHandler({ action: 'pause' }, () => onPause());
    MediaSession.setActionHandler({ action: 'previoustrack' }, () => onPrev());
    MediaSession.setActionHandler({ action: 'nexttrack' }, () => onNext());
  } catch (e) {
    console.error('MediaSession handlers error:', e);
  }
}

export function updateMediaMetadata(song) {
  if (!song) return;
  try {
    MediaSession.setMetadata({
      title: song.title || '',
      artist: song.artist || '',
      album: song.album || '',
      artwork: song.thumbnail ? [{ src: song.thumbnail, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
  } catch (e) {
    console.error('MediaSession metadata error:', e);
  }
}

export function updateMediaPlaybackState(isPlaying) {
  try {
    MediaSession.setPlaybackState({ playbackState: isPlaying ? 'playing' : 'paused' });
  } catch (e) {
    console.error('MediaSession playback state error:', e);
  }
}
