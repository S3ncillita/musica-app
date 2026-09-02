package com.musica.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Base64;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

// Foreground service para la notificación de reproducción. Un simple
// NotificationManager.notify() con setOngoing(true) no alcanza: se puede
// deslizar y borrar igual (confirmado en Xiaomi/MIUI, y en versiones nuevas
// de Android en general). Lo que realmente le da a la notificación el
// mismo "blindaje" que tiene Spotify no es solo el foreground service, es
// que esté atada a una MediaSessionCompat activa y real vía
// MediaStyle.setMediaSession(token) — así el sistema la reconoce como el
// reproductor de medios activo y le aplica sus reglas especiales de
// persistencia, en vez de tratarla como una notificación cualquiera.
public class PlaybackNotificationService extends Service {
    static final int NOTIFICATION_ID = 42;
    static final String CHANNEL_ID = "vybe_playback";

    static final String EXTRA_TITLE = "title";
    static final String EXTRA_ARTIST = "artist";
    static final String EXTRA_ARTWORK = "artwork";
    static final String EXTRA_PLAYING = "playing";

    static final String ACTION_PLAY = "com.musica.app.ACTION_PLAY";
    static final String ACTION_PAUSE = "com.musica.app.ACTION_PAUSE";
    static final String ACTION_NEXT = "com.musica.app.ACTION_NEXT";
    static final String ACTION_PREV = "com.musica.app.ACTION_PREV";
    static final String ACTION_STOP = "com.musica.app.ACTION_STOP";

    private MediaSessionCompat mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();
        mediaSession = new MediaSessionCompat(this, "VybePlayback");
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() { sendBroadcast(new Intent(ACTION_PLAY).setPackage(getPackageName())); }
            @Override public void onPause() { sendBroadcast(new Intent(ACTION_PAUSE).setPackage(getPackageName())); }
            @Override public void onSkipToNext() { sendBroadcast(new Intent(ACTION_NEXT).setPackage(getPackageName())); }
            @Override public void onSkipToPrevious() { sendBroadcast(new Intent(ACTION_PREV).setPackage(getPackageName())); }
            @Override public void onStop() { sendBroadcast(new Intent(ACTION_STOP).setPackage(getPackageName())); }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String title = intent.getStringExtra(EXTRA_TITLE);
        String artist = intent.getStringExtra(EXTRA_ARTIST);
        String artworkBase64 = intent.getStringExtra(EXTRA_ARTWORK);
        boolean isPlaying = intent.getBooleanExtra(EXTRA_PLAYING, false);

        ensureChannel();
        Bitmap artwork = decodeArtwork(artworkBase64);
        updateMediaSession(title, artist, artwork, isPlaying);
        Notification notification = buildNotification(title, artist, artwork, isPlaying);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        return START_NOT_STICKY;
    }

    private Bitmap decodeArtwork(String artworkBase64) {
        if (artworkBase64 == null || artworkBase64.isEmpty()) return null;
        try {
            byte[] bytes = Base64.decode(artworkBase64, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception e) {
            return null;
        }
    }

    private void updateMediaSession(String title, String artist, Bitmap artwork, boolean isPlaying) {
        MediaMetadataCompat.Builder metadata = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist);
        if (artwork != null) metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork);
        mediaSession.setMetadata(metadata.build());

        mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
            .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE
                | PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                | PlaybackStateCompat.ACTION_STOP)
            .setState(isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f)
            .build());
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Reproducción", NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(false);
            nm.createNotificationChannel(channel);
        }
    }

    private PendingIntent action(String action) {
        Intent intent = new Intent(action).setPackage(getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(this, action.hashCode(), intent, flags);
    }

    private Notification buildNotification(String title, String artist, Bitmap artwork, boolean isPlaying) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(artist)
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(new NotificationCompat.Action(android.R.drawable.ic_media_previous, "Anterior", action(ACTION_PREV)))
            .addAction(isPlaying
                ? new NotificationCompat.Action(android.R.drawable.ic_media_pause, "Pausar", action(ACTION_PAUSE))
                : new NotificationCompat.Action(android.R.drawable.ic_media_play, "Reproducir", action(ACTION_PLAY)))
            .addAction(new NotificationCompat.Action(android.R.drawable.ic_media_next, "Siguiente", action(ACTION_NEXT)))
            .addAction(new NotificationCompat.Action(android.R.drawable.ic_menu_close_clear_cancel, "Detener", action(ACTION_STOP)))
            .setStyle(new MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2));

        if (artwork != null) builder.setLargeIcon(artwork);
        return builder.build();
    }

    @Override
    public void onDestroy() {
        mediaSession.setActive(false);
        mediaSession.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
