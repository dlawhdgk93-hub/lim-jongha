package com.voicesecretary.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class WidgetHideCompletedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_TOGGLE_HIDE) return
    WidgetDataStore.toggleHideCompleted(context)
    WidgetRefreshHelper.refreshAll(context)
  }

  companion object {
    const val ACTION_TOGGLE_HIDE = "com.voicesecretary.app.WIDGET_TOGGLE_HIDE_COMPLETED"
  }
}
