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
import android.util.Base64;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

// Foreground service para la notificación de reproducción. Un simple
// NotificationManager.notify() con setOngoing(true) no alcanza en varios
// fabricantes (MIUI en particular) — el usuario igual puede deslizarla y
// borrarla. Mientras un foreground service esté corriendo, Android sí
// impide deslizar su notificación (es la misma técnica que usa Spotify).
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
        Notification notification = buildNotification(title, artist, artworkBase64, isPlaying);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        return START_NOT_STICKY;
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

    private Notification buildNotification(String title, String artist, String artworkBase64, boolean isPlaying) {
        Bitmap artwork = null;
        if (artworkBase64 != null && !artworkBase64.isEmpty()) {
            try {
                byte[] bytes = Base64.decode(artworkBase64, Base64.DEFAULT);
                artwork = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            } catch (Exception ignored) {}
        }

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
            .setStyle(new MediaStyle().setShowActionsInCompactView(0, 1, 2));

        if (artwork != null) builder.setLargeIcon(artwork);
        return builder.build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
