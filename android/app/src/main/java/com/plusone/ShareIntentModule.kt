package com.plusone

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShareIntentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ShareIntentModule"

  @ReactMethod
  fun getInitialSharedText(promise: Promise) {
    promise.resolve(MainActivity.consumePendingSharedText())
  }

  @ReactMethod
  fun getInitialSharedImage(promise: Promise) {
    promise.resolve(MainActivity.consumePendingSharedImage())
  }
}
