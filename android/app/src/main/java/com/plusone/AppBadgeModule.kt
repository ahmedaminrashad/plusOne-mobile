package com.plusone

import android.app.NotificationManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppBadgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AppBadgeModule"

  @ReactMethod
  fun clear(promise: Promise) {
    val manager =
      reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    manager?.cancelAll()
    promise.resolve(true)
  }
}
