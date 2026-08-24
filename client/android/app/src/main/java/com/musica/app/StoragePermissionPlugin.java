package com.musica.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StoragePermission")
public class StoragePermissionPlugin extends Plugin {

    @PluginMethod
    public void isAllFilesAccessGranted(PluginCall call) {
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.R || Environment.isExternalStorageManager();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAllFilesAccessSettings(PluginCall call) {
        try {
            Intent intent;
            Uri uri = Uri.parse("package:" + getContext().getPackageName());
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(uri);
            } else {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(uri);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir Ajustes", e);
        }
    }
}
