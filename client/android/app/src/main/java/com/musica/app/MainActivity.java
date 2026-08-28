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
    // DIAGNÓSTICO TEMPORAL: confirmar si esta vez sí sobrevive al
    // live-redirect. Se reagrega en onResume() (no solo en onCreate) por si
    // Capacitor recrea el WebView interno después de la creación inicial.
    public class DiagBridge {
        @JavascriptInterface
        public String ping() {
            return "pong";
        }
    }

    private void reinjectDiagBridge() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new DiagBridge(), "VybeDiag");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        reinjectDiagBridge();
    }

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
        reinjectDiagBridge();
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
        // página que llame de vuelta a algún puente JS→nativo (Capacitor
        // deja de reconocerse como plataforma nativa después del
        // live-redirect a un origen externo, así que cualquier plugin de
        // Capacitor —o un addJavascriptInterface agregado antes de esa
        // navegación— se pierde de forma poco confiable).
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
