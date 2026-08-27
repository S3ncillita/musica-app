package com.musica.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Puente directo, sin pasar por el sistema de plugins de Capacitor: una
    // vez que la app salta a la versión en vivo (live-redirect) y el WebView
    // navega a un origen externo, Capacitor deja de reconocerse como
    // plataforma nativa en esa página (Capacitor.getPlatform() pasa a
    // devolver "web"), así que cualquier llamada a un plugin (minimizeApp,
    // etc.) se pierde silenciosamente o falla. addJavascriptInterface, en
    // cambio, sigue funcionando sin importar el origen de la página cargada
    // en este mismo WebView.
    public class NativeBridge {
        @JavascriptInterface
        public void goHome() {
            Intent startMain = new Intent(Intent.ACTION_MAIN);
            startMain.addCategory(Intent.CATEGORY_HOME);
            startMain.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(startMain);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StoragePermissionPlugin.class);
        registerPlugin(GoHomePlugin.class);
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new NativeBridge(), "VybeNative");
        }
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
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(() ->
                        getBridge().getWebView().evaluateJavascript(
                            "window.__vybeBackPressed && window.__vybeBackPressed();", null
                        )
                    );
                }
            }
        });
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
