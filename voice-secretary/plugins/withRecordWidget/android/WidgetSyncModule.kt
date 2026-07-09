package com.voicesecretary.app

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetSyncModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "WidgetSyncModule"

  @ReactMethod
  fun syncSchedules(json: String, promise: Promise) {
    try {
      WidgetDataStore.save(reactApplicationContext, json)
      WidgetRefreshHelper.refreshAll(reactApplicationContext)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("WIDGET_SYNC_ERROR", error)
    }
  }
}
