package com.musica.app;

import android.Manifest;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StoragePermissionPlugin.class);
        super.onCreate(savedInstanceState);
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
                // TEMPORAL: cartel de diagnóstico. Si esto NO aparece al usar el
                // botón/gesto de atrás, Android ni siquiera nos está avisando —
                // el problema está antes de llegar a nuestro código. Si SÍ
                // aparece pero la app no reacciona, el problema está más
                // adelante (JS/WebView).
                Toast.makeText(MainActivity.this, "DEBUG: atrás detectado", Toast.LENGTH_SHORT).show();
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
}
