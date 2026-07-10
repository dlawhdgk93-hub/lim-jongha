package com.voicesecretary.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri

class WidgetScheduleToggleReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_TOGGLE) return

    val scheduleId = intent.getStringExtra(EXTRA_SCHEDULE_ID) ?: return
    WidgetDataStore.toggleScheduleStatus(context, scheduleId)
    WidgetRefreshHelper.refreshAll(context)

    val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse("teamday://toggle?id=$scheduleId")).apply {
      setPackage(context.packageName)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    context.startActivity(openIntent)
  }

  companion object {
    const val ACTION_TOGGLE = "com.voicesecretary.app.WIDGET_TOGGLE_SCHEDULE"
    const val EXTRA_SCHEDULE_ID = "schedule_id"
  }
}
