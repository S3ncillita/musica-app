package com.musica.app;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// MIUI (Xiaomi/Redmi/POCO) a veces ignora Activity.moveTaskToBack(), que es
// lo que usa @capacitor/app internamente para minimizeApp(). Mandar
// explícitamente al usuario a la pantalla de inicio con un Intent
// ACTION_MAIN/CATEGORY_HOME es más confiable entre fabricantes.
@CapacitorPlugin(name = "GoHome")
public class GoHomePlugin extends Plugin {
    @PluginMethod
    public void goHome(PluginCall call) {
        Intent startMain = new Intent(Intent.ACTION_MAIN);
        startMain.addCategory(Intent.CATEGORY_HOME);
        startMain.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(startMain);
        call.resolve();
    }
}
