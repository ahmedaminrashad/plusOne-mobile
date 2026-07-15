package com.plusone

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import java.io.File
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
    captureSharedContent(intent)
  }

  // launchMode="singleTask" means an already-running instance gets this instead of a
  // fresh onCreate — capture here too so sharing while the app is already open still works.
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    captureSharedContent(intent)
  }

  private fun captureSharedContent(intent: Intent?) {
    Log.d("PlusOneShare", "captureSharedContent action=${intent?.action} type=${intent?.type} extras=${intent?.extras?.keySet()}")
    if (intent?.action != Intent.ACTION_SEND) return
    if (intent.type == "text/plain") {
      pendingSharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      Log.d("PlusOneShare", "captured text, length=${pendingSharedText?.length}")
    } else if (intent.type?.startsWith("image/") == true) {
      val uri = getStreamExtra(intent)
      Log.d("PlusOneShare", "image branch, EXTRA_STREAM uri=$uri")
      if (uri == null) return
      pendingSharedImagePath = copySharedImageToInternalStorage(uri)
      Log.d("PlusOneShare", "copied image path=$pendingSharedImagePath")
    }
  }

  @Suppress("DEPRECATION")
  private fun getStreamExtra(intent: Intent): Uri? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      intent.getParcelableExtra(Intent.EXTRA_STREAM)
    }

  // Content:// URIs from the sharing app are only valid for the lifetime of the share —
  // copy the bytes into our own storage now so the path is still readable whenever the
  // user gets around to attaching it to a receipt later.
  private fun copySharedImageToInternalStorage(uri: Uri): String? {
    return try {
      val dir = File(filesDir, "shared_receipts").apply { mkdirs() }
      val file = File(dir, "receipt_${System.currentTimeMillis()}.jpg")
      contentResolver.openInputStream(uri)?.use { input ->
        file.outputStream().use { output -> input.copyTo(output) }
      }
      "file://${file.absolutePath}"
    } catch (e: Exception) {
      Log.e("PlusOneShare", "failed to copy shared image from $uri", e)
      null
    }
  }

  companion object {
    @Volatile
    private var pendingSharedText: String? = null

    @Volatile
    private var pendingSharedImagePath: String? = null

    // One-shot read: JS polls this on launch and on every foreground resume, so once
    // consumed it must not be handed out again on the next check.
    fun consumePendingSharedText(): String? {
      val text = pendingSharedText
      pendingSharedText = null
      return text
    }

    fun consumePendingSharedImage(): String? {
      val path = pendingSharedImagePath
      pendingSharedImagePath = null
      return path
    }
  }
}
