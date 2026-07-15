package com.plusone

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "PlusOne"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    captureSharedText(intent)
  }

  // launchMode="singleTask" means an already-running instance gets this instead of a
  // fresh onCreate — capture here too so sharing while the app is already open still works.
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    captureSharedText(intent)
  }

  private fun captureSharedText(intent: Intent?) {
    if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
      pendingSharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
    }
  }

  companion object {
    @Volatile
    private var pendingSharedText: String? = null

    // One-shot read: JS polls this on launch and on every foreground resume, so once
    // consumed it must not be handed out again on the next check.
    fun consumePendingSharedText(): String? {
      val text = pendingSharedText
      pendingSharedText = null
      return text
    }
  }
}
