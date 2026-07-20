package fr.yamadori.scouting;

import android.provider.Settings;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SafeAreaInsets")
public class SafeAreaInsetsPlugin extends Plugin {

    private static final String NAVIGATION_MODE = "navigation_mode";

    @Override
    public void load() {
        View decorView = getActivity().getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, windowInsets) -> {
            Insets statusBars = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            Insets navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
            notifyInsets(statusBars.top, navigationBars.bottom);
            return ViewCompat.onApplyWindowInsets(view, windowInsets);
        });
        ViewCompat.requestApplyInsets(decorView);
    }

    @PluginMethod
    public void getInsets(PluginCall call) {
        WindowInsetsCompat windowInsets = ViewCompat.getRootWindowInsets(
                getActivity().getWindow().getDecorView()
        );
        if (windowInsets == null) {
            call.resolve(insetsObject(0, 0));
            return;
        }
        Insets statusBars = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
        Insets navigationBars = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
        call.resolve(insetsObject(statusBars.top, navigationBars.bottom));
    }

    /** 0 = 3 boutons, 1 = 2 boutons, 2 = gestes. */
    private String readNavigationMode() {
        try {
            int mode = Settings.Secure.getInt(
                    getContext().getContentResolver(),
                    NAVIGATION_MODE,
                    0
            );
            return mode == 2 ? "gesture" : "buttons";
        } catch (Exception ignored) {
            return "buttons";
        }
    }

    private JSObject insetsObject(int top, int bottom) {
        JSObject result = new JSObject();
        result.put("top", top);
        result.put("bottom", bottom);
        result.put("mode", readNavigationMode());
        return result;
    }

    private void notifyInsets(int top, int bottom) {
        notifyListeners("insetsChange", insetsObject(top, bottom));
    }
}
