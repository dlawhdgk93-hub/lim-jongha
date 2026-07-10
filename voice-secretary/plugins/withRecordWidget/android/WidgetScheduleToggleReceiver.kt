package com.voicesecretary.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class WidgetScheduleToggleReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_TOGGLE) return

    val scheduleId = intent.getStringExtra(EXTRA_SCHEDULE_ID) ?: return
    val nextStatus = WidgetDataStore.toggleScheduleStatus(context, scheduleId) ?: return
    WidgetRefreshHelper.refreshAll(context)
    WidgetScheduleSync.syncScheduleStatus(context, scheduleId, nextStatus)
  }

  companion object {
    const val ACTION_TOGGLE = "com.voicesecretary.app.WIDGET_TOGGLE_SCHEDULE"
    const val EXTRA_SCHEDULE_ID = "schedule_id"
  }
}
