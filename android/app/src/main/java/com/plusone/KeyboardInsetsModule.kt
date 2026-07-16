package com.plusone

import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

// react-navigation's native-stack hosts each screen in its own Fragment, which on
// Android never receives the window resize that android:windowSoftInputMode="adjustResize"
// (and therefore RN's own Keyboard/KeyboardAvoidingView, which is driven by that resize)
// depends on — so KeyboardAvoidingView silently does nothing on those screens. Reading
// the IME WindowInsets directly off the decor view sidesteps that gap entirely and works
// regardless of which Fragment/screen is on top.
class KeyboardInsetsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

  private var attachedHashCode: Int? = null
  private var lastHeightPx = 0

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = "KeyboardInsetsModule"

  private fun attach() {
    val decorView = reactApplicationContext.currentActivity?.window?.decorView ?: return
    if (attachedHashCode == decorView.hashCode()) return
    attachedHashCode = decorView.hashCode()

    ViewCompat.setOnApplyWindowInsetsListener(decorView) { _, insets ->
      val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
      val navBarBottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
      // Only the part of the IME inset taller than the nav bar is the keyboard itself.
      val heightPx = (imeBottom - navBarBottom).coerceAtLeast(0)
      if (heightPx != lastHeightPx) {
        lastHeightPx = heightPx
        emitHeight(heightPx)
      }
      insets
    }
  }

  private fun emitHeight(heightPx: Int) {
    val density = reactApplicationContext.resources.displayMetrics.density
    val heightDp = heightPx / density
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("keyboardInsetHeight", heightDp.toDouble())
  }

  override fun onHostResume() = attach()

  override fun onHostPause() {}

  override fun onHostDestroy() {}

  // Required by the NativeEventEmitter JS contract; the emitter above is driven by the
  // window insets listener, not by listener add/remove counts.
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}
}
