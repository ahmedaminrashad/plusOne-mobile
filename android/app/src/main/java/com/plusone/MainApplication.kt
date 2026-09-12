package com.plusone

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(ShareIntentPackage())
          add(KeyboardInsetsPackage())
          add(AppBadgePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    ensureAlertChannel()
    loadReactNative(this)
  }

  private fun ensureAlertChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(ALERT_CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      ALERT_CHANNEL_ID,
      "PlusOne",
      NotificationManager.IMPORTANCE_HIGH,
    )
    channel.description = "Bills, chat, and payments"
    channel.enableVibration(true)
    channel.setShowBadge(true)
    manager.createNotificationChannel(channel)
  }

  companion object {
    const val ALERT_CHANNEL_ID = "plusone_alerts"
  }
}
