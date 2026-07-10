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
      WidgetScheduleSync.flushPending(reactApplicationContext)
      WidgetRefreshHelper.refreshAll(reactApplicationContext)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("WIDGET_SYNC_ERROR", error)
    }
  }

  @ReactMethod
  fun syncAuth(accessToken: String, supabaseUrl: String, anonKey: String, promise: Promise) {
    try {
      WidgetDataStore.saveAuth(reactApplicationContext, accessToken, supabaseUrl, anonKey)
      WidgetScheduleSync.flushPending(reactApplicationContext)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("WIDGET_AUTH_SYNC_ERROR", error)
    }
  }
}
