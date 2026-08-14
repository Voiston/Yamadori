# Capacitor bridge and Yamadori plugins
-keep class com.getcapacitor.** { *; }
-keep class fr.yamadori.scouting.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod *;
}

# Third-party Capacitor plugins (secure storage, billing)
-keep class com.whitestein.securestorage.** { *; }
-keep class io.capawesome.** { *; }

-keepattributes *Annotation*,InnerClasses,EnclosingMethod,Signature

# WebView JavaScript interface (Capacitor)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
