package com.musica.app;

import android.Manifest;
import android.app.DownloadManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.media.app.NotificationCompat.MediaStyle;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.net.URL;
import java.net.HttpURLConnection;

public class MainActivity extends BridgeActivity {
    private static final String UPDATE_CHANNEL = "vybe_update";
    private static final String PLAYBACK_CHANNEL = "vybe_playback";
    private static final int PLAYBACK_NOTIFICATION_ID = 42;

    private static final String ACTION_PLAY = "com.musica.app.ACTION_PLAY";
    private static final String ACTION_PAUSE = "com.musica.app.ACTION_PAUSE";
    private static final String ACTION_NEXT = "com.musica.app.ACTION_NEXT";
    private static final String ACTION_PREV = "com.musica.app.ACTION_PREV";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private BroadcastReceiver mediaButtonReceiver;

    // Puente directo con JS (addJavascriptInterface), sin pasar por el
    // sistema de plugins de Capacitor: una vez que la app salta a la
    // versión en vivo (live-redirect) y el WebView navega a un origen
    // externo, Capacitor deja de reconocerse como plataforma nativa ahí
    // (getPlatform() pasa a "web"), así que cualquier plugin de Capacitor
    // (Filesystem, cordova-plugin-apkupdater, @capgo/capacitor-media-session)
    // se pierde de forma silenciosa. Esta interfaz sí sobrevive, SIEMPRE
    // QUE se reagregue en onResume() además de en onCreate() — Capacitor
    // parece reemplazar su WebView interno en algún punto después de la
    // creación inicial, y si sólo se agrega una vez ahí queda pegada a una
    // instancia vieja que ya no es la visible.
    public class NativeBridge {
        @JavascriptInterface
        public String ping() {
            return "pong";
        }

        // ===== Descargas offline (reemplaza @capacitor/filesystem) =====
        // Usa almacenamiento propio de la app (getExternalFilesDir), que no
        // necesita ningún permiso especial de Android — a diferencia del
        // almacenamiento público compartido que se usaba antes.

        private File songsDir() {
            File dir = new File(getExternalFilesDir(null), "Music");
            if (!dir.exists()) dir.mkdirs();
            return dir;
        }

        @JavascriptInterface
        public boolean writeSongFile(String filename, String base64Data) {
            try {
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                File file = new File(songsDir(), filename);
                try (FileOutputStream out = new FileOutputStream(file)) {
                    out.write(bytes);
                }
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean deleteSongFile(String filename) {
            File file = new File(songsDir(), filename);
            return !file.exists() || file.delete();
        }

        @JavascriptInterface
        public boolean songFileExists(String filename) {
            return new File(songsDir(), filename).exists();
        }

        @JavascriptInterface
        public String songFileUrl(String filename) {
            File file = new File(songsDir(), filename);
            if (!file.exists()) return "";
            return "https://localhost/_capacitor_file_" + file.getAbsolutePath();
        }

        // ===== Actualización de la app (reemplaza cordova-plugin-apkupdater) =====

        @JavascriptInterface
        public void installUpdate(String apkUrl) {
            mainHandler.post(() -> startApkDownload(apkUrl));
        }

        // ===== Notificación de reproducción (reemplaza @capgo/capacitor-media-session) =====

        @JavascriptInterface
        public void updateNotification(String title, String artist, String artworkBase64, boolean isPlaying) {
            mainHandler.post(() -> showPlaybackNotification(title, artist, artworkBase64, isPlaying));
        }

        @JavascriptInterface
        public void clearNotification() {
            mainHandler.post(() -> {
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                nm.cancel(PLAYBACK_NOTIFICATION_ID);
            });
        }
    }

    private void reinjectNativeBridge() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "VybeNative");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        reinjectNativeBridge();
    }

    private void callJs(String script) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(script, null));
        }
    }

    // ===== Actualización: descarga con DownloadManager + instala =====

    private void startApkDownload(String apkUrl) {
        try {
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            // DownloadManager corre como un proceso/servicio del sistema
            // aparte, no puede escribir en el almacenamiento privado de la
            // app (getCacheDir()/getFilesDir()) — solo en almacenamiento
            // externo. Usamos el propio de la app (getExternalFilesDir), que
            // no necesita ningún permiso especial.
            String filename = "vybe-update.apk";
            File dest = new File(getExternalFilesDir(null), filename);
            if (dest.exists()) dest.delete();

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
            request.setTitle("Actualizando Vybe");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(this, null, filename);
            long downloadId = dm.enqueue(request);

            // No usamos DownloadManager.ACTION_DOWNLOAD_COMPLETE: ese aviso lo
            // manda el propio sistema Android, no nuestra app, así que con
            // RECEIVER_NOT_EXPORTED (obligatorio en Android 13+ para
            // receptores que no necesitan aceptar broadcasts externos) queda
            // bloqueado y nunca llega — la descarga se completaba pero nunca
            // se disparaba la instalación. El polling ya se entera solo del
            // final igual, sin depender de ningún broadcast.
            pollDownloadProgress(dm, downloadId, dest);
        } catch (Exception e) {
            callJs("window.__vybeUpdateError && window.__vybeUpdateError(" + jsonString(e.getMessage()) + ");");
        }
    }

    private void pollDownloadProgress(DownloadManager dm, long downloadId, File dest) {
        mainHandler.postDelayed(() -> {
            DownloadManager.Query q = new DownloadManager.Query().setFilterById(downloadId);
            try (Cursor c = dm.query(q)) {
                if (c != null && c.moveToFirst()) {
                    int statusIdx = c.getColumnIndex(DownloadManager.COLUMN_STATUS);
                    int status = statusIdx >= 0 ? c.getInt(statusIdx) : -1;
                    long soFar = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                    long total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                    if (total > 0) {
                        int pct = (int) (soFar * 100 / total);
                        callJs("window.__vybeUpdateProgress && window.__vybeUpdateProgress(" + pct + ");");
                    }
                    if (status == DownloadManager.STATUS_RUNNING || status == DownloadManager.STATUS_PENDING) {
                        pollDownloadProgress(dm, downloadId, dest);
                    } else if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        onApkDownloadComplete(dest);
                    } else {
                        callJs("window.__vybeUpdateError && window.__vybeUpdateError('Descarga falló');");
                    }
                }
            } catch (Exception ignored) {}
        }, 400);
    }

    private void onApkDownloadComplete(File dest) {
        try {
            Uri apkUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", dest);
            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(installIntent);
            callJs("window.__vybeUpdateDone && window.__vybeUpdateDone();");
        } catch (Exception e) {
            callJs("window.__vybeUpdateError && window.__vybeUpdateError(" + jsonString(e.getMessage()) + ");");
        }
    }

    private String jsonString(String s) {
        if (s == null) s = "Error desconocido";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    // ===== Notificación de reproducción =====

    private void ensureNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel playback = new NotificationChannel(
                PLAYBACK_CHANNEL, "Reproducción", NotificationManager.IMPORTANCE_LOW);
            playback.setShowBadge(false);
            nm.createNotificationChannel(playback);
            NotificationChannel update = new NotificationChannel(
                UPDATE_CHANNEL, "Actualizaciones", NotificationManager.IMPORTANCE_DEFAULT);
            nm.createNotificationChannel(update);
        }
    }

    private PendingIntent mediaAction(String action) {
        Intent intent = new Intent(action).setPackage(getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(this, action.hashCode(), intent, flags);
    }

    private void showPlaybackNotification(String title, String artist, String artworkBase64, boolean isPlaying) {
        Bitmap artwork = null;
        if (artworkBase64 != null && !artworkBase64.isEmpty()) {
            try {
                byte[] bytes = Base64.decode(artworkBase64, Base64.DEFAULT);
                artwork = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            } catch (Exception ignored) {}
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, PLAYBACK_CHANNEL)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(artist)
            .setOnlyAlertOnce(true)
            .setOngoing(isPlaying)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(new NotificationCompat.Action(android.R.drawable.ic_media_previous, "Anterior", mediaAction(ACTION_PREV)))
            .addAction(isPlaying
                ? new NotificationCompat.Action(android.R.drawable.ic_media_pause, "Pausar", mediaAction(ACTION_PAUSE))
                : new NotificationCompat.Action(android.R.drawable.ic_media_play, "Reproducir", mediaAction(ACTION_PLAY)))
            .addAction(new NotificationCompat.Action(android.R.drawable.ic_media_next, "Siguiente", mediaAction(ACTION_NEXT)))
            .setStyle(new MediaStyle().setShowActionsInCompactView(0, 1, 2));

        if (artwork != null) builder.setLargeIcon(artwork);

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(PLAYBACK_NOTIFICATION_ID, builder.build());
    }

    private void registerMediaButtonReceiver() {
        mediaButtonReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                String jsAction = ACTION_PLAY.equals(action) ? "play"
                    : ACTION_PAUSE.equals(action) ? "pause"
                    : ACTION_NEXT.equals(action) ? "next"
                    : ACTION_PREV.equals(action) ? "prev" : null;
                if (jsAction != null) {
                    callJs("window.__vybeMediaAction && window.__vybeMediaAction('" + jsAction + "');");
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_PLAY);
        filter.addAction(ACTION_PAUSE);
        filter.addAction(ACTION_NEXT);
        filter.addAction(ACTION_PREV);
        int flag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            ? ContextCompat.RECEIVER_NOT_EXPORTED : ContextCompat.RECEIVER_NOT_EXPORTED;
        ContextCompat.registerReceiver(this, mediaButtonReceiver, filter, flag);
    }

    // ===== Minimizar (botón de atrás) =====

    private void goHome() {
        Intent startMain = new Intent(Intent.ACTION_MAIN);
        startMain.addCategory(Intent.CATEGORY_HOME);
        startMain.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(startMain);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StoragePermissionPlugin.class);
        super.onCreate(savedInstanceState);
        reinjectNativeBridge();
        ensureNotificationChannels();
        registerMediaButtonReceiver();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
            }
        }

        // Registrado DESPUÉS de super.onCreate() (que ya cargó el callback propio
        // de @capacitor/app), así que este queda arriba en la pila y se ejecuta
        // primero. En vez de depender del evento "backButton" del plugin (que en
        // algunos dispositivos no llega de forma confiable, sobre todo con el
        // gesto de deslizar), llamamos directo a una función JS por WebView.
        //
        // window.__vybeBackPressed() devuelve un string: 'MINIMIZE' cuando la
        // UI de React ya cerró todo lo que tenía que cerrar (modales, cola,
        // etc.) y lo que corresponde es mandar la app a segundo plano. Se
        // decide y ejecuta directo acá, en nativo, en vez de pedirle a la
        // página que llame de vuelta a algún puente JS→nativo.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(() ->
                        getBridge().getWebView().evaluateJavascript(
                            "(window.__vybeBackPressed && window.__vybeBackPressed()) || ''",
                            result -> {
                                if (result != null && result.replace("\"", "").equals("MINIMIZE")) {
                                    runOnUiThread(MainActivity.this::goHome);
                                }
                            }
                        )
                    );
                }
            }
        });
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mediaButtonReceiver != null) {
            try { unregisterReceiver(mediaButtonReceiver); } catch (Exception ignored) {}
        }
    }

    // El WebView se queda con la tecla física/de 3 botones de "atrás" antes de
    // que llegue al OnBackPressedDispatcher (por eso el gesto sí funcionaba
    // pero el botón no: el gesto no pasa por dispatchKeyEvent). Interceptamos
    // acá para que nunca llegue al WebView y la mandamos por el mismo camino
    // que ya funciona para el gesto.
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
            getOnBackPressedDispatcher().onBackPressed();
            return true;
        }
        return super.dispatchKeyEvent(event);
    }
}
